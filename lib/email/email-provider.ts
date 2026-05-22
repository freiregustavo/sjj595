export type EmailMessage = {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailProvider = {
  send(message: EmailMessage): Promise<{ providerMessageId?: string }>;
};

class NoopEmailProvider implements EmailProvider {
  async send() {
    return {};
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER ?? "noop";

  if (provider === "noop") {
    return new NoopEmailProvider();
  }

  throw new Error(`Email provider "${provider}" is not implemented yet.`);
}
