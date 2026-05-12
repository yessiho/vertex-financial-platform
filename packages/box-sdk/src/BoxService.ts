import { logger } from '../../apps/mobile-api/src/utils/logger';

export type DocumentCategory =
  | 'invoice' | 'tax_filing' | 'payroll'
  | 'bank_statement' | 'report' | 'contract' | 'other';

export interface EntityFolderIds {
  rootFolderId: string;
  documentsFolderId: string;
  reportsFolderId: string;
  taxFolderId: string;
  payrollFolderId: string;
}

const CATEGORY_TO_FOLDER: Record<DocumentCategory, keyof EntityFolderIds> = {
  invoice:       'documentsFolderId',
  contract:      'documentsFolderId',
  bank_statement:'documentsFolderId',
  other:         'documentsFolderId',
  report:        'reportsFolderId',
  tax_filing:    'taxFolderId',
  payroll:       'payrollFolderId',
};

export class BoxService {
  private static instance: BoxService;
  private client: any = null;
  private isConfigured: boolean = false;

  private constructor() {
    this.isConfigured = !!(
      process.env.BOX_CLIENT_ID &&
      process.env.BOX_CLIENT_SECRET &&
      process.env.BOX_ENTERPRISE_ID &&
      process.env.BOX_JWT_KEY_ID &&
      process.env.BOX_JWT_PRIVATE_KEY
    );

    if (this.isConfigured) {
      try {
        const BoxSDK = require('box-node-sdk');
        const sdk = new BoxSDK({
          clientID: process.env.BOX_CLIENT_ID,
          clientSecret: process.env.BOX_CLIENT_SECRET,
          appAuth: {
            algorithm: 'RS256',
            expirationTime: 30,
            verifyTimestamp: true,
            keyID: process.env.BOX_JWT_KEY_ID,
            privateKey: process.env.BOX_JWT_PRIVATE_KEY!.replace(/\\n/g, '\n'),
            passphrase: process.env.BOX_JWT_PASSPHRASE,
          },
        });
        this.client = sdk.getAppAuthClient('enterprise', process.env.BOX_ENTERPRISE_ID);
        logger.info('Box Platform SDK initialized');
      } catch (err) {
        logger.warn('Box Platform SDK failed to initialize:', err);
        this.isConfigured = false;
      }
    } else {
      logger.info('Box Platform not configured — document uploads will use local metadata only');
    }
  }

  static getInstance(): BoxService {
    if (!BoxService.instance) BoxService.instance = new BoxService();
    return BoxService.instance;
  }

  isReady(): boolean { return this.isConfigured && !!this.client; }

  /**
   * Provision folder structure for a new entity in Box.
   * Creates: /{entityName}/Documents/, /Reports/, /Tax/, /Payroll/
   */
  async provisionEntityFolders(
    entityId: string,
    entityName: string
  ): Promise<EntityFolderIds | null> {
    if (!this.isReady()) {
      logger.info(`Box not configured — skipping folder provisioning for entity: ${entityName}`);
      return null;
    }

    try {
      const rootParentId = process.env.BOX_ROOT_FOLDER_ID || '0';
      const entityFolder = await this.client.folders.create(rootParentId, entityName);

      const [docsFolder, reportsFolder, taxFolder, payrollFolder] = await Promise.all([
        this.client.folders.create(entityFolder.id, 'Documents'),
        this.client.folders.create(entityFolder.id, 'Reports'),
        this.client.folders.create(entityFolder.id, 'Tax'),
        this.client.folders.create(entityFolder.id, 'Payroll'),
      ]);

      logger.info(`Box folders provisioned for entity ${entityId}`);

      return {
        rootFolderId:      entityFolder.id,
        documentsFolderId: docsFolder.id,
        reportsFolderId:   reportsFolder.id,
        taxFolderId:       taxFolder.id,
        payrollFolderId:   payrollFolder.id,
      };
    } catch (err) {
      logger.error(`Failed to provision Box folders for entity ${entityId}:`, err);
      return null;
    }
  }

  /**
   * Upload a file buffer to the correct entity subfolder based on category.
   */
  async uploadDocument(
    folderIds: EntityFolderIds,
    category: DocumentCategory,
    fileName: string,
    fileBuffer: Buffer,
  ): Promise<{ boxFileId: string; boxFolderId: string } | null> {
    if (!this.isReady()) return null;

    try {
      const targetFolderKey = CATEGORY_TO_FOLDER[category];
      const targetFolderId = folderIds[targetFolderKey];

      const { Readable } = require('stream');
      const stream = new Readable();
      stream.push(fileBuffer);
      stream.push(null);

      const uploaded = await this.client.files.uploadFile(targetFolderId, fileName, stream);
      const file = uploaded.entries[0];

      logger.info(`File uploaded to Box: ${file.id} → ${targetFolderKey}`);
      return { boxFileId: file.id, boxFolderId: targetFolderId };
    } catch (err) {
      logger.error('Box upload failed:', err);
      return null;
    }
  }

  /**
   * Get a pre-authenticated temporary download URL for a file.
   */
  async getDownloadUrl(boxFileId: string): Promise<string | null> {
    if (!this.isReady()) return null;
    try {
      const info = await this.client.files.update(boxFileId, {
        shared_link: {
          access: 'open',
          unshared_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      });
      return info.shared_link?.download_url || null;
    } catch { return null; }
  }

  /**
   * Verify a Box webhook signature.
   */
  verifyWebhookSignature(
    body: string,
    primaryKey: string,
    deliveryTimestamp: string,
    signature: string,
  ): boolean {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', primaryKey)
      .update(body + deliveryTimestamp)
      .digest('base64');
    return signature === expected;
  }
}
