// OB-001: Welcome Email Sequence

import type { EmailSequence, EmailSendRecord, EmailSendStatus } from './types';

const sequenceStore = new Map<string, EmailSequence>();
const sendRecordStore = new Map<string, EmailSendRecord[]>();

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface CreateSequenceInput {
  name: string;
  product: string;
  triggerEvent: string;
  emails: Array<{
    subject: string;
    templateId: string;
    delayHours: number;
    condition?: string;
  }>;
}

export function createEmailSequence(input: CreateSequenceInput): EmailSequence {
  const seq: EmailSequence = {
    id: generateId(),
    name: input.name,
    product: input.product,
    triggerEvent: input.triggerEvent,
    emails: input.emails.map((e, i) => ({
      stepIndex: i,
      subject: e.subject,
      templateId: e.templateId,
      delayHours: e.delayHours,
      condition: e.condition,
    })),
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  sequenceStore.set(seq.id, seq);
  return seq;
}

export function getSequenceById(id: string): EmailSequence | undefined {
  return sequenceStore.get(id);
}

export function listSequences(product?: string): EmailSequence[] {
  let seqs = Array.from(sequenceStore.values());
  if (product) seqs = seqs.filter((s) => s.product === product);
  return seqs;
}

export function toggleSequence(id: string, enabled: boolean): EmailSequence {
  const seq = sequenceStore.get(id);
  if (!seq) throw new Error(`Sequence ${id} not found`);
  seq.enabled = enabled;
  seq.updatedAt = new Date();
  return seq;
}

export interface EmailSender {
  send(to: string, subject: string, templateId: string, variables: Record<string, unknown>): Promise<string>;
}

export async function triggerSequence(
  sequenceId: string,
  userId: string,
  email: string,
  variables: Record<string, unknown>,
  sender: EmailSender,
): Promise<EmailSendRecord[]> {
  const seq = sequenceStore.get(sequenceId);
  if (!seq || !seq.enabled) return [];

  const records: EmailSendRecord[] = [];
  for (const step of seq.emails) {
    const record: EmailSendRecord = {
      id: generateId(),
      sequenceId,
      stepIndex: step.stepIndex,
      userId,
      email,
      status: 'pending',
      scheduledAt: new Date(Date.now() + step.delayHours * 3600 * 1000),
      createdAt: new Date(),
    };

    // For first email (delay 0), send immediately
    if (step.delayHours === 0) {
      try {
        const messageId = await sender.send(email, step.subject, step.templateId, variables);
        record.status = 'sent';
        record.sentAt = new Date();
        record.metadata = { messageId };
      } catch (err) {
        record.status = 'failed';
        record.metadata = { error: err instanceof Error ? err.message : String(err) };
      }
    }

    records.push(record);
  }

  const existing = sendRecordStore.get(userId) ?? [];
  existing.push(...records);
  sendRecordStore.set(userId, existing);

  return records;
}

export function getUserSendRecords(userId: string): EmailSendRecord[] {
  return sendRecordStore.get(userId) ?? [];
}

export function updateSendStatus(
  userId: string,
  recordId: string,
  status: EmailSendStatus,
): EmailSendRecord | undefined {
  const records = sendRecordStore.get(userId);
  if (!records) return undefined;
  const record = records.find((r) => r.id === recordId);
  if (!record) return undefined;
  record.status = status;
  if (status === 'sent') record.sentAt = new Date();
  if (status === 'delivered') record.deliveredAt = new Date();
  if (status === 'opened') record.openedAt = new Date();
  return record;
}

export function clearEmailSequenceStores(): void {
  sequenceStore.clear();
  sendRecordStore.clear();
}
