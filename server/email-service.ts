import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Configuração usando variáveis de ambiente
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      };

      // Verificar se as credenciais estão configuradas
      if (!config.auth.user || !config.auth.pass) {
        console.warn('Credenciais de email não configuradas. Emails de recuperação de senha não serão enviados.');
        console.warn('Configure as variáveis: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT');
        return;
      }

      this.transporter = nodemailer.createTransport(config);

      // Verificar conexão
      this.transporter.verify((error, success) => {
        if (error) {
          console.warn('Erro na configuração do email - usando modo desenvolvimento:', error.message);
          console.log('Para Hotmail/Outlook, você precisa de uma "senha de aplicativo" ao invés da senha normal.');
          console.log('Instruções: https://support.microsoft.com/pt-br/account-billing/manage-app-passwords-for-two-step-verification-d6dc8c6d-4bf7-4b3b-b7b8-5ff81c78c0c1');
          this.transporter = null;
        } else {
          console.log('Servidor de email configurado com sucesso');
        }
      });
    } catch (error) {
      console.error('Erro ao inicializar serviço de email:', error);
    }
  }

  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendPasswordResetEmail(email: string, userName: string, resetToken: string): Promise<boolean> {
    if (!this.transporter) {
      console.log('=== MODO DESENVOLVIMENTO - SIMULAÇÃO DE EMAIL ===');
      console.log(`Para: ${email}`);
      console.log(`Nome: ${userName}`);
      console.log(`Token: ${resetToken}`);
      console.log(`Link de recuperação: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`);
      console.log('=== FIM DA SIMULAÇÃO ===');
      return false;
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"AmigoMontador" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Recuperação de Senha - AmigoMontador',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperação de Senha</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
              .footer { background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6c757d; }
              .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
              .button:hover { background-color: #0056b3; }
              .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AmigoMontador</h1>
                <h2>Recuperação de Senha</h2>
              </div>
              
              <div class="content">
                <p>Olá, <strong>${userName}</strong>!</p>
                
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no AmigoMontador.</p>
                
                <p>Para criar uma nova senha, clique no botão abaixo:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Redefinir Senha</a>
                </div>
                
                <p>Ou copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                  ${resetUrl}
                </p>
                
                <div class="warning">
                  <strong>⚠️ Importante:</strong>
                  <ul>
                    <li>Este link é válido por 24 horas</li>
                    <li>Se você não solicitou esta alteração, ignore este email</li>
                    <li>Por segurança, não compartilhe este link com ninguém</li>
                  </ul>
                </div>
                
                <p>Se você não conseguir clicar no botão, entre em contato conosco através do suporte.</p>
                
                <p>Atenciosamente,<br>
                Equipe AmigoMontador</p>
              </div>
              
              <div class="footer">
                <p>Este email foi enviado automaticamente. Por favor, não responda.</p>
                <p>© 2025 AmigoMontador. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email de recuperação enviado:', result.messageId);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }
}

export const emailService = new EmailService();