#!/usr/bin/env npx tsx

/**
 * Process VDI Labor Disputes Statistics
 *
 * Input: 13 CSV files (2013-2025) from data/open-data/16_dg_*.csv
 * Output: data/processed/labor-disputes-stats.json
 *
 * Usage:
 *   npx tsx scripts/process-labor-disputes.ts
 *   npx tsx scripts/process-labor-disputes.ts --dry-run  # Preview only
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Types
interface LaborDisputeStats {
  meta: {
    totalCases: number;
    yearRange: string;
    lastUpdated: string;
  };

  outcomes: {
    tenkinamaPilnai: { count: number; pct: number };
    tenkinamaDalies: { count: number; pct: number };
    atmesta: { count: number; pct: number };
    taikosSutartis: { count: number; pct: number };
    atsisakyta: { count: number; pct: number };
    other: { count: number; pct: number };
  };

  byClaimType: Array<{
    claimType: string;
    count: number;
    pct: number;
    outcomes: {
      tenkinamaPilnai: number;
      tenkinamaDalies: number;
      atmesta: number;
      taikosSutartis: number;
    };
    avgAmountAwarded?: number;
  }>;

  byIndustry: Array<{
    industry: string;
    count: number;
    outcomes: {
      tenkinamaPilnai: number;
      tenkinamaDalies: number;
      atmesta: number;
    };
  }>;

  amounts: {
    avgAwarded: number;
    medianAwarded: number;
    p25: number;
    p75: number;
  };
}

interface RawCase {
  PRAS_ID: string;
  PBUS_PAV: string; // Case status: "Užbaigtas"
  DGSP_PAV: string; // Outcome
  REIKG: string; // Claim type group
  JUR_ATS_EV: string; // Industry (EVRK)
  SUMOS2: string; // Amounts (complex format)
}

// Map outcome values to canonical categories
function mapOutcome(
  dgspPav: string
): keyof LaborDisputeStats['outcomes'] | null {
  if (!dgspPav) return null;

  const cleaned = dgspPav.trim().toLowerCase();

  if (cleaned.includes('tenkinama pilnai')) return 'tenkinamaPilnai';
  if (
    cleaned.includes('tenkinama iš dalies') ||
    cleaned.includes('tenkinama is dalies')
  )
    return 'tenkinamaDalies';
  if (cleaned.includes('atmesta')) return 'atmesta';
  if (cleaned.includes('taikos sutart')) return 'taikosSutartis';
  if (
    cleaned.includes('atsisakyta') ||
    cleaned.includes('prašymas laikomas nepateiktu')
  )
    return 'atsisakyta';

  // Skip incomplete cases
  if (
    cleaned.includes('atidėtas') ||
    cleaned.includes('sprendimas byloje') ||
    cleaned === ''
  )
    return null;

  return 'other';
}

// Extract primary claim type from REIKG field
function extractPrimaryClaimType(reikg: string): string {
  if (!reikg) return 'kita';

  // Clean up and get first claim type
  const cleaned = reikg
    .replace(/"/g, '')
    .replace(/\(DGK\)/g, '')
    .replace(/;/g, '')
    .trim();

  // Extract the first claim type (before any semicolon in original)
  const parts = cleaned.split(/\s{2,}/);
  let primary = parts[0].trim();

  // Normalize common claim types
  if (primary.includes('darbo užmokesčio')) return 'dėl darbo užmokesčio';
  if (primary.includes('atleidimo iš darbo pripažinimo'))
    return 'dėl atleidimo iš darbo';
  if (primary.includes('turtinės žalos')) return 'dėl turtinės žalos';
  if (primary.includes('neturtinės žalos')) return 'dėl neturtinės žalos';
  if (primary.includes('darbo sutarties sąlygų'))
    return 'dėl darbo sutarties sąlygų';
  if (primary.includes('baudos')) return 'dėl baudos';
  if (primary.includes('formuluotės pakeitimo'))
    return 'dėl atleidimo formuluotės pakeitimo';
  if (primary.includes('darbo ir poilsio laiko')) return 'dėl darbo laiko';
  if (primary.includes('socialinį draudimą')) return 'dėl VSDF duomenų';
  if (primary.includes('termino atnaujinimo')) return 'dėl termino atnaujinimo';

  return primary || 'kita';
}

// Clean industry name
function cleanIndustry(industry: string): string {
  if (!industry) return 'Nenurodyta';

  const cleaned = industry
    .replace(/"/g, '')
    .replace(/\s*\(2 red\.\)\s*/g, '')
    .trim();

  return cleaned || 'Nenurodyta';
}

// Parse amounts from SUMOS2 field
// Format: "Type; claimed; claimed_tax; awarded; awarded_tax; ..."
function parseAwardedAmounts(sumos2: string): number[] {
  if (!sumos2) return [];

  const amounts: number[] = [];

  // Split by multiple spaces (entries separator)
  const entries = sumos2.split(/\s{2,}/);

  for (const entry of entries) {
    // Each entry format: "Type; claimed; claimed_tax; awarded; awarded_tax; ..."
    const parts = entry.split(';').map((p) => p.trim());

    if (parts.length >= 4) {
      // parts[0] = type, parts[1] = claimed, parts[2] = claimed_tax
      // parts[3] = awarded, parts[4] = awarded_tax
      const awarded = parseFloat(parts[3]);

      if (!isNaN(awarded) && awarded > 0) {
        amounts.push(awarded);
      }
    }
  }

  return amounts;
}

// Calculate statistics
function calculateStats(
  cases: RawCase[],
  dryRun: boolean
): LaborDisputeStats | null {
  // Filter to completed cases only
  const completedCases = cases.filter(
    (c) => c.PBUS_PAV === 'Užbaigtas' || c.PBUS_PAV === '"Užbaigtas"'
  );

  console.log(`Total cases loaded: ${cases.length}`);
  console.log(`Completed cases: ${completedCases.length}`);

  // Initialize outcome counters
  const outcomes = {
    tenkinamaPilnai: { count: 0, pct: 0 },
    tenkinamaDalies: { count: 0, pct: 0 },
    atmesta: { count: 0, pct: 0 },
    taikosSutartis: { count: 0, pct: 0 },
    atsisakyta: { count: 0, pct: 0 },
    other: { count: 0, pct: 0 },
  };

  // Maps for claim types and industries
  const claimTypeMap = new Map<
    string,
    {
      count: number;
      outcomes: {
        tenkinamaPilnai: number;
        tenkinamaDalies: number;
        atmesta: number;
        taikosSutartis: number;
      };
      amounts: number[];
    }
  >();

  const industryMap = new Map<
    string,
    {
      count: number;
      outcomes: {
        tenkinamaPilnai: number;
        tenkinamaDalies: number;
        atmesta: number;
      };
    }
  >();

  // All awarded amounts for wage claims
  const allWageAmounts: number[] = [];

  let validOutcomeCount = 0;

  for (const c of completedCases) {
    const outcome = mapOutcome(c.DGSP_PAV);
    if (!outcome) continue;

    validOutcomeCount++;
    outcomes[outcome].count++;

    // Process claim type
    const claimType = extractPrimaryClaimType(c.REIKG);
    if (!claimTypeMap.has(claimType)) {
      claimTypeMap.set(claimType, {
        count: 0,
        outcomes: {
          tenkinamaPilnai: 0,
          tenkinamaDalies: 0,
          atmesta: 0,
          taikosSutartis: 0,
        },
        amounts: [],
      });
    }
    const claimData = claimTypeMap.get(claimType)!;
    claimData.count++;
    if (
      outcome in claimData.outcomes &&
      outcome !== 'atsisakyta' &&
      outcome !== 'other'
    ) {
      claimData.outcomes[outcome as keyof typeof claimData.outcomes]++;
    }

    // Parse amounts for wage claims
    if (claimType === 'dėl darbo užmokesčio') {
      const amounts = parseAwardedAmounts(c.SUMOS2);
      claimData.amounts.push(...amounts);
      allWageAmounts.push(...amounts);
    }

    // Process industry
    const industry = cleanIndustry(c.JUR_ATS_EV);
    if (!industryMap.has(industry)) {
      industryMap.set(industry, {
        count: 0,
        outcomes: { tenkinamaPilnai: 0, tenkinamaDalies: 0, atmesta: 0 },
      });
    }
    const industryData = industryMap.get(industry)!;
    industryData.count++;
    if (
      outcome === 'tenkinamaPilnai' ||
      outcome === 'tenkinamaDalies' ||
      outcome === 'atmesta'
    ) {
      industryData.outcomes[outcome]++;
    }
  }

  // Calculate percentages
  for (const key of Object.keys(outcomes) as (keyof typeof outcomes)[]) {
    outcomes[key].pct =
      Math.round((outcomes[key].count / validOutcomeCount) * 1000) / 10;
  }

  // Build byClaimType array (top 10)
  const byClaimType = Array.from(claimTypeMap.entries())
    .map(([claimType, data]) => {
      const total = data.count;
      const avgAmount =
        data.amounts.length > 0
          ? Math.round(
              data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
            )
          : undefined;

      return {
        claimType,
        count: total,
        pct: Math.round((total / validOutcomeCount) * 1000) / 10,
        outcomes: {
          tenkinamaPilnai:
            Math.round((data.outcomes.tenkinamaPilnai / total) * 1000) / 10,
          tenkinamaDalies:
            Math.round((data.outcomes.tenkinamaDalies / total) * 1000) / 10,
          atmesta: Math.round((data.outcomes.atmesta / total) * 1000) / 10,
          taikosSutartis:
            Math.round((data.outcomes.taikosSutartis / total) * 1000) / 10,
        },
        avgAmountAwarded: avgAmount,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Build byIndustry array (top 15)
  const byIndustry = Array.from(industryMap.entries())
    .filter(([industry]) => industry !== 'Nenurodyta' && industry !== '')
    .map(([industry, data]) => ({
      industry,
      count: data.count,
      outcomes: {
        tenkinamaPilnai:
          Math.round((data.outcomes.tenkinamaPilnai / data.count) * 1000) / 10,
        tenkinamaDalies:
          Math.round((data.outcomes.tenkinamaDalies / data.count) * 1000) / 10,
        atmesta:
          Math.round((data.outcomes.atmesta / data.count) * 1000) / 10,
      },
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Calculate wage claim amounts statistics
  const sortedAmounts = allWageAmounts.sort((a, b) => a - b);
  const amounts = {
    avgAwarded:
      sortedAmounts.length > 0
        ? Math.round(
            sortedAmounts.reduce((a, b) => a + b, 0) / sortedAmounts.length
          )
        : 0,
    medianAwarded:
      sortedAmounts.length > 0
        ? Math.round(sortedAmounts[Math.floor(sortedAmounts.length / 2)])
        : 0,
    p25:
      sortedAmounts.length > 0
        ? Math.round(sortedAmounts[Math.floor(sortedAmounts.length * 0.25)])
        : 0,
    p75:
      sortedAmounts.length > 0
        ? Math.round(sortedAmounts[Math.floor(sortedAmounts.length * 0.75)])
        : 0,
  };

  const stats: LaborDisputeStats = {
    meta: {
      totalCases: validOutcomeCount,
      yearRange: '2013-2025',
      lastUpdated: new Date().toISOString().split('T')[0],
    },
    outcomes,
    byClaimType,
    byIndustry,
    amounts,
  };

  // Log summary
  console.log('\n=== Statistics Summary ===');
  console.log(`Total valid cases: ${validOutcomeCount}`);
  console.log('\nOutcomes:');
  console.log(
    `  Tenkinama pilnai: ${outcomes.tenkinamaPilnai.count} (${outcomes.tenkinamaPilnai.pct}%)`
  );
  console.log(
    `  Tenkinama iš dalies: ${outcomes.tenkinamaDalies.count} (${outcomes.tenkinamaDalies.pct}%)`
  );
  console.log(`  Atmesta: ${outcomes.atmesta.count} (${outcomes.atmesta.pct}%)`);
  console.log(
    `  Taikos sutartis: ${outcomes.taikosSutartis.count} (${outcomes.taikosSutartis.pct}%)`
  );
  console.log(
    `  Atsisakyta nagrinėti: ${outcomes.atsisakyta.count} (${outcomes.atsisakyta.pct}%)`
  );
  console.log(`  Kita: ${outcomes.other.count} (${outcomes.other.pct}%)`);

  const totalPct =
    outcomes.tenkinamaPilnai.pct +
    outcomes.tenkinamaDalies.pct +
    outcomes.atmesta.pct +
    outcomes.taikosSutartis.pct +
    outcomes.atsisakyta.pct +
    outcomes.other.pct;
  console.log(`  Total %: ${Math.round(totalPct * 10) / 10}%`);

  console.log('\nTop 5 Claim Types:');
  for (const ct of byClaimType.slice(0, 5)) {
    const winRate = ct.outcomes.tenkinamaPilnai + ct.outcomes.tenkinamaDalies;
    console.log(
      `  ${ct.claimType}: ${ct.count} (${ct.pct}%), win rate: ${winRate}%`
    );
  }

  console.log('\nWage Claim Amounts:');
  console.log(`  Average: ${amounts.avgAwarded} EUR`);
  console.log(`  Median: ${amounts.medianAwarded} EUR`);
  console.log(`  25th percentile: ${amounts.p25} EUR`);
  console.log(`  75th percentile: ${amounts.p75} EUR`);
  console.log(`  Total samples: ${sortedAmounts.length}`);

  if (dryRun) {
    console.log('\n[DRY RUN] Would write to data/processed/labor-disputes-stats.json');
    return null;
  }

  return stats;
}

// Main
async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('Processing VDI Labor Disputes Statistics...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'FULL'}`);

  // Find all CSV files
  const dataDir = path.join(process.cwd(), 'data/open-data');
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.startsWith('16_dg_') && f.endsWith('.csv'))
    .sort();

  console.log(`Found ${files.length} CSV files`);

  // Load all cases
  const allCases: RawCase[] = [];

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const records = parse(content, {
      columns: true,
      delimiter: '\t',
      relax_quotes: true,
      skip_empty_lines: true,
    }) as RawCase[];

    allCases.push(...records);
    console.log(`  ${file}: ${records.length} records`);
  }

  // Calculate statistics
  const stats = calculateStats(allCases, dryRun);

  if (stats) {
    // Write output
    const outputPath = path.join(process.cwd(), 'data/processed/labor-disputes-stats.json');
    fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));
    console.log(`\nWritten to: ${outputPath}`);
  }
}

main().catch(console.error);
