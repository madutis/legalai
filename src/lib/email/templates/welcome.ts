// Welcome email template for LegalAI
// Brand colors converted from oklch to hex for email compatibility

const COLORS = {
  background: '#FAF8F5',      // Warm cream
  cardBg: '#FFFFFF',          // White cards
  primary: '#1E3A5F',         // Deep navy
  gold: '#C4973D',            // Gold accent
  goldLight: '#F5EFE0',       // Light gold background
  text: '#2D3748',            // Dark text
  textMuted: '#6B7280',       // Muted text
  border: '#E8E4DD',          // Warm border
};

const FONTS = {
  serif: "'Playfair Display', Georgia, serif",
  sans: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export interface WelcomeEmailData {
  userName?: string;
  unsubscribeUrl?: string;
}

export function generateWelcomeEmailHtml(data: WelcomeEmailData = {}): string {
  const { userName, unsubscribeUrl = 'https://legalai.lt/account' } = data;
  const greeting = userName ? `Sveiki, ${userName}!` : 'Sveiki!';

  return `
<!DOCTYPE html>
<html lang="lt" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Sveiki atvykę į LegalAI</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Source+Sans+3:wght@400;500;600&display=swap');

    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }

    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .content { padding: 24px 20px !important; }
      .feature-table { display: block !important; }
      .feature-cell { display: block !important; width: 100% !important; padding: 8px 0 !important; }
      .cta-button { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: ${FONTS.sans};">

  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    Jūsų 7 dienų nemokamas bandymas prasidėjo. Pradėkite konsultaciją su AI darbo teisės asistentu.
  </div>

  <!-- Main wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Container -->
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">

          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="line-height: 0;">
                    <!-- Scale icon matching homepage - navy bg with gold scales -->
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Crect width='32' height='32' rx='6' fill='%231e3a5f'/%3E%3Cg stroke='%23c9a227' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 5v22'/%3E%3Cpath d='M4 9h24'/%3E%3Cpath d='M7 9l-3 10h6l-3-10'/%3E%3Cpath d='M4 19a3 3 0 0 0 6 0'/%3E%3Cpath d='M25 9l-3 10h6l-3-10'/%3E%3Cpath d='M22 19a3 3 0 0 0 6 0'/%3E%3Ccircle cx='16' cy='8' r='2' fill='%23c9a227'/%3E%3C/g%3E%3C/svg%3E" alt="LegalAI" width="44" height="44" style="display: block; border-radius: 8px;">
                  </td>
                  <td style="padding-left: 14px;">
                    <span style="font-family: ${FONTS.serif}; font-size: 26px; font-weight: 600; color: ${COLORS.primary}; letter-spacing: -0.5px;">LegalAI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.cardBg}; border-radius: 16px; border: 1px solid ${COLORS.border}; overflow: hidden;">

                <!-- Gold accent bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, ${COLORS.gold}, ${COLORS.primary});"></td>
                </tr>

                <!-- Content -->
                <tr>
                  <td class="content" style="padding: 40px 36px;">

                    <!-- Greeting -->
                    <h1 style="margin: 0 0 8px 0; font-family: ${FONTS.serif}; font-size: 28px; font-weight: 600; color: ${COLORS.primary}; line-height: 1.2;">
                      ${greeting}
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 18px; color: ${COLORS.gold}; font-weight: 500;">
                      Sveiki atvykę į LegalAI
                    </p>

                    <!-- Intro text -->
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: ${COLORS.text}; line-height: 1.6;">
                      Džiaugiamės, kad prisijungėte! Dabar turite prieigą prie AI asistento, kuris padės jums
                      orientuotis Lietuvos darbo teisėje – nuo įdarbinimo iki atleidimo, nuo atostogų iki
                      drausminės atsakomybės.
                    </p>

                    <!-- Trial badge -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr>
                        <td style="background-color: ${COLORS.goldLight}; border-radius: 10px; padding: 16px 20px; border-left: 4px solid ${COLORS.gold};">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 12px; vertical-align: top;">
                                <span style="font-size: 24px;">🎁</span>
                              </td>
                              <td>
                                <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${COLORS.primary};">
                                  7 dienų nemokamas bandymas
                                </p>
                                <p style="margin: 0; font-size: 14px; color: ${COLORS.textMuted};">
                                  Išbandykite visas funkcijas be jokių įsipareigojimų
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                      <tr>
                        <td align="center">
                          <a href="https://legalai.lt/chat" class="cta-button" style="display: inline-block; background-color: ${COLORS.primary}; color: #ffffff; font-family: ${FONTS.sans}; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 10px; mso-padding-alt: 0;">
                            <!--[if mso]>
                            <i style="mso-font-width: 200%; mso-text-raise: 30px;">&#8195;</i>
                            <![endif]-->
                            <span style="mso-text-raise: 15px;">Pradėti konsultaciją →</span>
                            <!--[if mso]>
                            <i style="mso-font-width: 200%;">&#8195;</i>
                            <![endif]-->
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                      <tr>
                        <td style="border-top: 1px solid ${COLORS.border};"></td>
                      </tr>
                    </table>

                    <!-- Features heading -->
                    <p style="margin: 0 0 16px 0; font-size: 13px; font-weight: 600; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 1px;">
                      Duomenų šaltiniai
                    </p>

                    <!-- Features grid -->
                    <table role="presentation" class="feature-table" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                      <tr>
                        <td class="feature-cell" width="50%" style="padding: 8px 8px 8px 0; vertical-align: top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 10px; vertical-align: top;">
                                <span style="font-size: 18px;">📘</span>
                              </td>
                              <td>
                                <p style="margin: 0 0 2px 0; font-size: 14px; font-weight: 600; color: ${COLORS.text};">Darbo kodeksas</p>
                                <p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted};">264 straipsniai</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td class="feature-cell" width="50%" style="padding: 8px 0 8px 8px; vertical-align: top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 10px; vertical-align: top;">
                                <span style="font-size: 18px;">⚖️</span>
                              </td>
                              <td>
                                <p style="margin: 0 0 2px 0; font-size: 14px; font-weight: 600; color: ${COLORS.text};">LAT praktika</p>
                                <p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted};">58 nutartys</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td class="feature-cell" width="50%" style="padding: 8px 8px 8px 0; vertical-align: top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 10px; vertical-align: top;">
                                <span style="font-size: 18px;">💬</span>
                              </td>
                              <td>
                                <p style="margin: 0 0 2px 0; font-size: 14px; font-weight: 600; color: ${COLORS.text};">VDI šaltiniai</p>
                                <p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted};">260 DUK + dokumentai</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td class="feature-cell" width="50%" style="padding: 8px 0 8px 8px; vertical-align: top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right: 10px; vertical-align: top;">
                                <span style="font-size: 18px;">📋</span>
                              </td>
                              <td>
                                <p style="margin: 0 0 2px 0; font-size: 14px; font-weight: 600; color: ${COLORS.text};">LRV nutarimai</p>
                                <p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted};">12 nutarimų</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Privacy note -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: ${COLORS.background}; border-radius: 8px; padding: 12px 16px;">
                          <p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted}; text-align: center;">
                            🔒 Jūsų pokalbiai nesaugomi – kiekviena konsultacija yra privati
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 16px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.textMuted};">
                Imum, UAB · S. Konarskio g. 2-29, LT-03122 Vilnius
              </p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: ${COLORS.textMuted};">
                <a href="mailto:labas@legalai.lt" style="color: ${COLORS.gold}; text-decoration: none;">labas@legalai.lt</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: ${COLORS.textMuted};">
                <a href="https://legalai.lt/privacy" style="color: ${COLORS.textMuted}; text-decoration: underline;">Privatumo politika</a>
                &nbsp;·&nbsp;
                <a href="${unsubscribeUrl}" style="color: ${COLORS.textMuted}; text-decoration: underline;">Atsisakyti naujienlaiškių</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`.trim();
}

export function generateWelcomeEmailText(data: WelcomeEmailData = {}): string {
  const { userName } = data;
  const greeting = userName ? `Sveiki, ${userName}!` : 'Sveiki!';

  return `
${greeting}

SVEIKI ATVYKĘ Į LEGALAI

Džiaugiamės, kad prisijungėte! Dabar turite prieigą prie AI asistento, kuris padės jums orientuotis Lietuvos darbo teisėje.

🎁 7 DIENŲ NEMOKAMAS BANDYMAS
Išbandykite visas funkcijas be jokių įsipareigojimų.

→ Pradėti konsultaciją: https://legalai.lt/chat

DUOMENŲ ŠALTINIAI:
• Darbo kodeksas – 264 straipsniai
• LAT praktika – 58 nutartys
• VDI šaltiniai – 260 DUK + dokumentai
• LRV nutarimai – 12 nutarimų

🔒 Jūsų pokalbiai nesaugomi – kiekviena konsultacija yra privati.

---

Imum, UAB
S. Konarskio g. 2-29, LT-03122 Vilnius
labas@legalai.lt

Privatumo politika: https://legalai.lt/privacy
`.trim();
}
