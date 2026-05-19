import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const enviarEmailRecuperacion = async (email: string, token: string) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"Voluntariado Cultural" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Recuperacion de contrasena',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #14532d, #16a34a); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Voluntariado Cultural</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #14532d;">Recupera tu contrasena</h2>
          <p style="color: #6b7280;">Hemos recibido una solicitud para restablecer tu contrasena. Haz clic en el boton para continuar:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}" style="background: #16a34a; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Restablecer contrasena
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px;">Este enlace caduca en 1 hora. Si no solicitaste este cambio, ignora este email.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            O copia este enlace: ${url}
          </p>
        </div>
      </div>
    `
  });
};
