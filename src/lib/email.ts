/**
 * Notificaciones por email.
 *
 * ESTADO REAL: no hay proveedor SMTP configurado en este entorno. Los envíos
 * quedan registrados en el log del servidor (cola de salida) y la UI avisa al
 * administrador. Cuando exista cuenta SMTP, configurar SMTP_URL en .env y
 * sustituir deliver() por el proveedor real.
 */

export type OutgoingEmail = {
  to: string;
  subject: string;
  body: string;
};

export async function sendEmail(mail: OutgoingEmail): Promise<{ delivered: boolean }> {
  if (process.env.SMTP_URL) {
    // Punto único de integración futura (SMTP/Resend/etc.). Hoy: sin proveedor.
    console.info("[email] SMTP configurado pero proveedor no implementado aún", mail.to);
    return { delivered: false };
  }
  console.info(
    `[email:cola] to=${mail.to} subject="${mail.subject}" — sin SMTP configurado, queda registrada`,
  );
  return { delivered: false };
}
