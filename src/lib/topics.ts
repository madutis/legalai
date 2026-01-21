import type { TopicConfig } from '@/types';

export const TOPICS: TopicConfig[] = [
  {
    id: 'hiring',
    labelLT: 'Įdarbinimas',
    labelEN: 'Hiring',
    questions: [
      {
        id: 'contract_type',
        textLT: 'Kokio tipo darbo sutartis planuojama?',
        options: [
          { value: 'indefinite', labelLT: 'Neterminuota' },
          { value: 'fixed', labelLT: 'Terminuota' },
          { value: 'project', labelLT: 'Projektinė' },
          { value: 'part_time', labelLT: 'Ne visas darbo laikas' },
        ],
      },
      {
        id: 'is_new',
        textLT: 'Ar tai naujas darbuotojas ar pratęsimas?',
        options: [
          { value: 'new', labelLT: 'Naujas darbuotojas' },
          { value: 'extension', labelLT: 'Sutarties pratęsimas' },
        ],
      },
    ],
  },
  {
    id: 'termination',
    labelLT: 'Atleidimas',
    labelEN: 'Termination',
    questions: [
      {
        id: 'initiator',
        textLT: 'Kas inicijuoja atleidimą?',
        options: [
          { value: 'employer', labelLT: 'Darbdavys' },
          { value: 'employee', labelLT: 'Darbuotojas' },
          { value: 'mutual', labelLT: 'Abipusis susitarimas' },
        ],
      },
      {
        id: 'tenure',
        textLT: 'Kiek laiko darbuotojas dirba įmonėje?',
        options: [
          { value: 'less_1', labelLT: 'Mažiau nei 1 metai' },
          { value: '1_3', labelLT: '1-3 metai' },
          { value: '3_10', labelLT: '3-10 metų' },
          { value: 'more_10', labelLT: 'Daugiau nei 10 metų' },
        ],
      },
      {
        id: 'notice_given',
        textLT: 'Ar yra įspėjimo laikotarpis?',
        options: [
          { value: 'yes', labelLT: 'Taip' },
          { value: 'no', labelLT: 'Ne' },
          { value: 'unsure', labelLT: 'Nežinau' },
        ],
      },
    ],
  },
  {
    id: 'leave',
    labelLT: 'Atostogos',
    labelEN: 'Leave',
    questions: [
      {
        id: 'leave_type',
        textLT: 'Kokio tipo atostogos?',
        options: [
          { value: 'annual', labelLT: 'Kasmetinės' },
          { value: 'sick', labelLT: 'Ligos' },
          { value: 'maternity', labelLT: 'Motinystės/tėvystės' },
          { value: 'unpaid', labelLT: 'Neapmokamos' },
          { value: 'study', labelLT: 'Mokymosi' },
        ],
      },
    ],
  },
  {
    id: 'wages',
    labelLT: 'Darbo užmokestis',
    labelEN: 'Wages',
    questions: [
      {
        id: 'wage_issue',
        textLT: 'Koks darbo užmokesčio klausimas?',
        options: [
          { value: 'delay', labelLT: 'Vėlavimas mokėti' },
          { value: 'calculation', labelLT: 'Skaičiavimas' },
          { value: 'overtime', labelLT: 'Viršvalandžiai' },
          { value: 'bonus', labelLT: 'Premijos' },
          { value: 'deductions', labelLT: 'Išskaitos' },
        ],
      },
    ],
  },
  {
    id: 'disciplinary',
    labelLT: 'Drausminė atsakomybė',
    labelEN: 'Disciplinary Liability',
    questions: [
      {
        id: 'disciplinary_type',
        textLT: 'Koks drausminės atsakomybės klausimas?',
        options: [
          { value: 'warning', labelLT: 'Įspėjimas' },
          { value: 'dismissal', labelLT: 'Atleidimas už pažeidimą' },
          { value: 'procedure', labelLT: 'Procedūra' },
        ],
      },
    ],
  },
  {
    id: 'material',
    labelLT: 'Materialinė atsakomybė',
    labelEN: 'Material Liability',
    questions: [
      {
        id: 'material_type',
        textLT: 'Koks materialinės atsakomybės klausimas?',
        options: [
          { value: 'damage', labelLT: 'Žalos atlyginimas' },
          { value: 'limits', labelLT: 'Atsakomybės ribos' },
          { value: 'procedure', labelLT: 'Išieškojimo tvarka' },
        ],
      },
    ],
  },
  {
    id: 'contracts',
    labelLT: 'Darbo sutartys',
    labelEN: 'Contracts',
    questions: [
      {
        id: 'contract_issue',
        textLT: 'Koks darbo sutarties klausimas?',
        options: [
          { value: 'conditions', labelLT: 'Sąlygų keitimas' },
          { value: 'violations', labelLT: 'Pažeidimai' },
          { value: 'interpretation', labelLT: 'Interpretacija' },
        ],
      },
    ],
  },
  {
    id: 'safety',
    labelLT: 'Darbo sauga',
    labelEN: 'Occupational Safety',
    questions: [
      {
        id: 'safety_type',
        textLT: 'Koks darbo saugos klausimas?',
        options: [
          { value: 'training', labelLT: 'Instruktavimas/mokymai' },
          { value: 'incident', labelLT: 'Nelaimingas atsitikimas' },
          { value: 'remote', labelLT: 'Nuotolinis darbas' },
          { value: 'rules', labelLT: 'Taisyklės/dokumentai' },
          { value: 'general', labelLT: 'Bendri reikalavimai' },
        ],
      },
    ],
  },
  {
    id: 'other',
    labelLT: 'Kita',
    labelEN: 'Other',
    questions: [],
  },
];

export function getTopicById(id: string): TopicConfig | undefined {
  return TOPICS.find((t) => t.id === id);
}
