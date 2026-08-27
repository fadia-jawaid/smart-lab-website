// import nodemailer from 'nodemailer';
// import { env }    from './env';

// const transporter = nodemailer.createTransport({
//   host:   env.SMTP_HOST,
//   port:   env.SMTP_PORT,
//   secure: false,
//   auth: {
//     user: env.SMTP_USER,
//     pass: env.SMTP_PASS,
//   },
// });

// export async function sendResetCode(
//   toEmail:   string,
//   toName:    string,
//   resetCode: string,
// ): Promise<void> {
//   await transporter.sendMail({
//     from:    env.SMTP_FROM,
//     to:      toEmail,
//     subject: 'SmartLab — Your Password Reset Code',
//     html: `
//       <!DOCTYPE html>
//       <html>
//       <body style="margin:0;padding:0;background:#0f1117;font-family:Arial,sans-serif;">
//         <div style="max-width:480px;margin:40px auto;background:#1a1d27;border-radius:16px;overflow:hidden;">

//           <div style="background:linear-gradient(135deg,#1D9E75,#185FA5);padding:32px;text-align:center;">
//             <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">🔬 SmartLab</h1>
//             <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">
//               Chemical Management System
//             </p>
//           </div>

//           <div style="padding:32px;">
//             <p style="color:#cbd5e1;font-size:16px;margin:0 0 8px;">
//               Hello, <strong style="color:#f1f5f9;">${toName}</strong>
//             </p>
//             <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
//               We received a request to reset your SmartLab password.
//               Use the code below — it expires in
//               <strong style="color:#f1f5f9;">15 minutes</strong>.
//             </p>

//             <div style="background:#0f1117;border:1px solid #334155;border-radius:12px;
//                         padding:24px;text-align:center;margin-bottom:24px;">
//               <p style="margin:0 0 8px;color:#64748b;font-size:12px;
//                          text-transform:uppercase;letter-spacing:2px;">
//                 Your Reset Code
//               </p>
//               <p style="margin:0;color:#1D9E75;font-size:40px;font-weight:700;
//                          letter-spacing:8px;font-family:monospace;">
//                 ${resetCode}
//               </p>
//             </div>

//             <p style="color:#64748b;font-size:12px;margin:0;">
//               If you did not request a password reset, ignore this email.
//               Your password will not be changed.
//             </p>
//           </div>

//           <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
//             <p style="margin:0;color:#475569;font-size:11px;">
//               SmartLab Chemical Tracking System · Do not reply to this email
//             </p>
//           </div>

//         </div>
//       </body>
//       </html>
//     `,
//   });

//   console.log(`📧  Reset code email sent to ${toEmail}`);
// }


import nodemailer from 'nodemailer';
import { env }    from './env';

export const mailer = nodemailer.createTransport({
  host:   env.SMTP_HOST,
  port:   env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendResetCode(
  toEmail:   string,
  toName:    string,
  resetCode: string,
): Promise<void> {
  await mailer.sendMail({
    from:    env.SMTP_FROM,
    to:      toEmail,
    subject: 'SmartLab — Password Reset Code',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0f1117;font-family:Arial,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#1a1d27;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1D9E75,#185FA5);padding:32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">🔬 SmartLab</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">
              Chemical Management System
            </p>
          </div>

          <!-- Body -->
          <div style="padding:32px;">
            <p style="color:#cbd5e1;font-size:16px;margin:0 0 8px;">
              Hello, <strong style="color:#f1f5f9;">${toName}</strong>
            </p>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
              We received a request to reset your SmartLab password.
              Use the code below — it expires in <strong style="color:#f1f5f9;">15 minutes</strong>.
            </p>

            <!-- Code box -->
            <div style="background:#0f1117;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:2px;">
                Your Reset Code
              </p>
              <p style="margin:0;color:#1D9E75;font-size:40px;font-weight:700;letter-spacing:8px;font-family:monospace;">
                ${resetCode}
              </p>
            </div>

            <p style="color:#64748b;font-size:12px;margin:0;">
              If you did not request a password reset, ignore this email.
              Your password will not be changed.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0;color:#475569;font-size:11px;">
              SmartLab Chemical Tracking System · Do not reply to this email
            </p>
          </div>

        </div>
      </body>
      </html>
    `,
  });
}