export interface BookingNotificationPayload {
  bookingId: string;
  startTime: string;
  serviceName: string;
  barberName: string;
  salonName: string;
  salonAddress: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
}

function formatIstDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set; skipping email send');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'bookings@shravkashtech.com',
      to,
      subject,
      html,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }
}

async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: Record<string, string>,
): Promise<void> {
  const authKey = Deno.env.get('MSG91_AUTH_KEY');
  if (!authKey) {
    console.warn('MSG91_AUTH_KEY not set; skipping WhatsApp send');
    return;
  }

  const response = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      integrated_number: Deno.env.get('MSG91_INTEGRATED_NUMBER'),
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en', policy: 'deterministic' },
          namespace: Deno.env.get('MSG91_NAMESPACE'),
          to_and_components: [{ to: [to], components: params }],
        },
      },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`MSG91 WhatsApp send failed (${response.status}): ${body}`);
  }
}

export async function sendBookingConfirmation(booking: BookingNotificationPayload): Promise<void> {
  const when = formatIstDateTime(booking.startTime);
  const tasks: Promise<void>[] = [];

  if (booking.customerEmail) {
    tasks.push(
      sendEmail(
        booking.customerEmail,
        `Booking confirmed at ${booking.salonName}`,
        `<p>Hi ${booking.customerName},</p>
<p>Your <strong>${booking.serviceName}</strong> appointment with <strong>${booking.barberName}</strong> at
<strong>${booking.salonName}</strong>${booking.salonAddress ? ` (${booking.salonAddress})` : ''} is confirmed for
<strong>${when}</strong>.</p>
<p>Booking ID: ${booking.bookingId}</p>`,
      ),
    );
  }

  if (booking.customerPhone) {
    tasks.push(
      sendWhatsAppTemplate(booking.customerPhone, 'booking_confirmation', {
        salon_name: booking.salonName,
        date: when,
        barber_name: booking.barberName,
        booking_id: booking.bookingId,
      }),
    );
  }

  await Promise.all(tasks);
}

/** Triggered ~1 hour before the slot via pg_cron; same channels as the confirmation. */
export async function sendBookingReminder(booking: BookingNotificationPayload): Promise<void> {
  const when = formatIstDateTime(booking.startTime);
  const tasks: Promise<void>[] = [];

  if (booking.customerEmail) {
    tasks.push(
      sendEmail(
        booking.customerEmail,
        `Reminder: your appointment at ${booking.salonName} is coming up`,
        `<p>Hi ${booking.customerName},</p>
<p>This is a reminder that your <strong>${booking.serviceName}</strong> appointment with
<strong>${booking.barberName}</strong> at <strong>${booking.salonName}</strong> is at
<strong>${when}</strong>.</p>
<p>Booking ID: ${booking.bookingId}</p>`,
      ),
    );
  }

  if (booking.customerPhone) {
    tasks.push(
      sendWhatsAppTemplate(booking.customerPhone, 'booking_reminder', {
        salon_name: booking.salonName,
        date: when,
        barber_name: booking.barberName,
        booking_id: booking.bookingId,
      }),
    );
  }

  await Promise.all(tasks);
}

export async function sendCancellation(
  booking: BookingNotificationPayload,
  refunded: boolean,
): Promise<void> {
  const when = formatIstDateTime(booking.startTime);
  const refundLine = refunded
    ? 'A full refund has been initiated and will reflect in your account within 5-7 business days.'
    : 'This booking was not eligible for an automatic refund.';
  const tasks: Promise<void>[] = [];

  if (booking.customerEmail) {
    tasks.push(
      sendEmail(
        booking.customerEmail,
        `Booking cancelled at ${booking.salonName}`,
        `<p>Hi ${booking.customerName},</p>
<p>Your <strong>${booking.serviceName}</strong> appointment with <strong>${booking.barberName}</strong> at
<strong>${booking.salonName}</strong> on <strong>${when}</strong> has been cancelled.</p>
<p>${refundLine}</p>
<p>Booking ID: ${booking.bookingId}</p>`,
      ),
    );
  }

  if (booking.customerPhone) {
    tasks.push(
      sendWhatsAppTemplate(booking.customerPhone, 'booking_cancellation', {
        salon_name: booking.salonName,
        date: when,
        refund_status: refunded ? 'refunded' : 'not_refunded',
        booking_id: booking.bookingId,
      }),
    );
  }

  await Promise.all(tasks);
}
