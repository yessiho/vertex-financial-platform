interface RoutingContext {
  entityId: string;
  entityName: string;
  orgName: string;
  senderName: string;
  senderEmail: string;
  teamEmail: string;
  teamName: string;
}

interface MessagePayload {
  subject: string;
  body: string;
  priority: 'normal' | 'high' | 'urgent';
}

export class Talk2CCRouter {
  private static instance: Talk2CCRouter;
  private isConfigured: boolean = false;
  private sgMail: any = null;

  private constructor() {
    this.isConfigured = !!process.env.SENDGRID_API_KEY;
    if (this.isConfigured) {
      try {
        this.sgMail = require('@sendgrid/mail');
        this.sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
        console.log('talk2cc: SendGrid initialized');
      } catch {
        this.isConfigured = false;
        console.log('talk2cc: SendGrid not available');
      }
    } else {
      console.log('talk2cc: SendGrid not configured — messages stored in DB only');
    }
  }

  static getInstance(): Talk2CCRouter {
    if (!Talk2CCRouter.instance) Talk2CCRouter.instance = new Talk2CCRouter();
    return Talk2CCRouter.instance;
  }

  isReady(): boolean { return this.isConfigured && !!this.sgMail; }

  async routeMessage(
    context: RoutingContext,
    message: MessagePayload,
  ): Promise<{ emailMessageId: string | null }> {
    if (!this.isReady()) {
      console.log(`talk2cc: [DB-only] Message from ${context.senderEmail} → ${context.teamEmail} | ${message.subject}`);
      return { emailMessageId: null };
    }

    const priorityTag = message.priority !== 'normal' ? `[${message.priority.toUpperCase()}] ` : '';
    const subject = `${priorityTag}[${context.entityName}] ${message.subject}`;

    try {
      const [response] = await this.sgMail.send({
        from: { email: process.env.EMAIL_FROM!, name: `${context.senderName} via Vertex Portal` },
        to: context.teamEmail,
        replyTo: { email: context.senderEmail, name: context.senderName },
        subject,
        text: this.buildText(context, message),
        html: this.buildHtml(context, message),
        headers: {
          'X-Vertex-Entity-Id': context.entityId,
          'X-Vertex-Priority': message.priority,
        },
      });
      const emailMessageId = response.headers?.['x-message-id'] as string || null;
      console.log(`talk2cc: email routed → ${context.teamEmail} [${message.priority}]`);
      return { emailMessageId };
    } catch (err) {
      console.error('talk2cc: SendGrid error:', err);
      return { emailMessageId: null };
    }
  }

  async routeReply(
    context: RoutingContext,
    originalMessageId: string,
    replyBody: string,
    isFromTeam: boolean,
  ): Promise<{ emailMessageId: string | null }> {
    if (!this.isReady()) return { emailMessageId: null };

    try {
      const [response] = await this.sgMail.send({
        from: { email: process.env.EMAIL_FROM!, name: isFromTeam ? context.teamName : `${context.senderName} via Vertex` },
        to: isFromTeam ? context.senderEmail : context.teamEmail,
        replyTo: isFromTeam ? context.teamEmail : context.senderEmail,
        subject: `Re: [${context.entityName}]`,
        text: replyBody,
        headers: {
          'In-Reply-To': originalMessageId,
          'References': originalMessageId,
          'X-Vertex-Entity-Id': context.entityId,
        },
      });
      return { emailMessageId: response.headers?.['x-message-id'] || null };
    } catch (err) {
      console.error('talk2cc reply error:', err);
      return { emailMessageId: null };
    }
  }

  private buildText(ctx: RoutingContext, msg: MessagePayload): string {
    return [
      `From: ${ctx.senderName} (${ctx.senderEmail})`,
      `Entity: ${ctx.entityName} | Org: ${ctx.orgName}`,
      `Priority: ${msg.priority.toUpperCase()}`,
      '',
      msg.body,
      '',
      '---',
      'Reply to this email to respond via the Vertex Portal Message Center.',
    ].join('\n');
  }

  private buildHtml(ctx: RoutingContext, msg: MessagePayload): string {
    const color = { normal: '#0f6e56', high: '#854f0b', urgent: '#a32d2d' }[msg.priority];
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#f1efe8;padding:16px 24px;border-radius:8px 8px 0 0;">
          <strong style="font-size:18px;">New Message – Vertex Portal</strong>
        </div>
        <div style="padding:24px;border:1px solid #d3d1c7;border-top:none;border-radius:0 0 8px 8px;">
          <table style="width:100%;font-size:14px;margin-bottom:16px;">
            <tr><td style="color:#5f5e5a;width:100px;">From</td><td><strong>${ctx.senderName}</strong> &lt;${ctx.senderEmail}&gt;</td></tr>
            <tr><td style="color:#5f5e5a;">Entity</td><td><strong>${ctx.entityName}</strong></td></tr>
            <tr><td style="color:#5f5e5a;">Priority</td><td><span style="color:${color};font-weight:bold;text-transform:uppercase;">${msg.priority}</span></td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #d3d1c7;margin:16px 0;">
          <div style="white-space:pre-wrap;line-height:1.6;">${msg.body}</div>
          <hr style="border:none;border-top:1px solid #d3d1c7;margin:24px 0 16px;">
          <p style="color:#888780;font-size:13px;">Reply to this email to respond via the Vertex Portal Message Center.</p>
        </div>
      </div>`;
  }
}
