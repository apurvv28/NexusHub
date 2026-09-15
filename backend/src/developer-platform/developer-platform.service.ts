import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

export type OAuthScope = 'read:messages' | 'write:messages' | 'read:channels' | 'admin:workspace';

export interface DeveloperApp {
  appId: string;
  name: string;
  description: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  allowedScopes: OAuthScope[];
  workspaceId: string;
  createdByUserId: string;
  createdAt: Date;
}

export interface OAuthAuthCode {
  code: string;
  clientId: string;
  userId: string;
  workspaceId: string;
  requestedScopes: OAuthScope[];
  expiresAt: Date;
}

export interface OAuthTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string;
  refreshToken?: string;
}

@Injectable()
export class DeveloperPlatformService {
  private readonly logger = new Logger(DeveloperPlatformService.name);
  private developerApps: Map<string, DeveloperApp> = new Map(); // clientId -> DeveloperApp
  private authCodes: Map<string, OAuthAuthCode> = new Map(); // code -> OAuthAuthCode

  /**
   * Register a new 3rd-party developer application
   */
  async registerApp(
    workspaceId: string,
    userId: string,
    name: string,
    description: string,
    redirectUris: string[],
    scopes: OAuthScope[] = ['read:messages', 'write:messages'],
  ): Promise<DeveloperApp> {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('App name is required');
    }

    const clientId = `nx_client_${crypto.randomBytes(8).toString('hex')}`;
    const clientSecret = `nx_secret_${crypto.randomBytes(16).toString('hex')}`;

    const app: DeveloperApp = {
      appId: `app_${Date.now()}`,
      name,
      description,
      clientId,
      clientSecret,
      redirectUris,
      allowedScopes: scopes,
      workspaceId,
      createdByUserId: userId,
      createdAt: new Date(),
    };

    this.developerApps.set(clientId, app);
    this.logger.log(`[DeveloperPlatform] Registered 3rd-party app '${name}' (${clientId}) in workspace ${workspaceId}`);
    return app;
  }

  /**
   * Get app by Client ID
   */
  async getAppByClientId(clientId: string): Promise<DeveloperApp | undefined> {
    return this.developerApps.get(clientId);
  }

  /**
   * Issue Authorization Code for OAuth 2.0 Authorization Code Grant Flow
   */
  async issueAuthCode(
    clientId: string,
    userId: string,
    workspaceId: string,
    scopes: OAuthScope[],
  ): Promise<string> {
    const app = this.developerApps.get(clientId);
    if (!app) {
      throw new BadRequestException('Invalid Client ID');
    }

    const code = `nx_code_${crypto.randomBytes(12).toString('hex')}`;
    const authCode: OAuthAuthCode = {
      code,
      clientId,
      userId,
      workspaceId,
      requestedScopes: scopes,
      expiresAt: new Date(Date.now() + 600000), // 10 minutes TTL
    };

    this.authCodes.set(code, authCode);
    this.logger.log(`[DeveloperPlatform] Issued OAuth 2.0 auth code for app '${app.name}' user ${userId}`);
    return code;
  }

  /**
   * Exchange Authorization Code or Client Credentials for Access Token
   */
  async exchangeToken(
    grantType: 'authorization_code' | 'client_credentials',
    clientId: string,
    clientSecret: string,
    code?: string,
  ): Promise<OAuthTokenResponse> {
    const app = this.developerApps.get(clientId);
    if (!app || app.clientSecret !== clientSecret) {
      throw new UnauthorizedException('Invalid OAuth client credentials');
    }

    let issuedScopes: OAuthScope[] = app.allowedScopes;

    if (grantType === 'authorization_code') {
      if (!code) {
        throw new BadRequestException('Authorization code is required for authorization_code grant type');
      }
      const authCodeObj = this.authCodes.get(code);
      if (!authCodeObj || authCodeObj.expiresAt < new Date()) {
        throw new UnauthorizedException('Expired or invalid authorization code');
      }
      issuedScopes = authCodeObj.requestedScopes;
      this.authCodes.delete(code); // Single-use code
    }

    const tokenPayload = {
      sub: app.appId,
      clientId: app.clientId,
      workspaceId: app.workspaceId,
      scopes: issuedScopes,
      iat: Date.now(),
    };

    const accessToken = `nx_at_${Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')}`;
    const refreshToken = `nx_rt_${crypto.randomBytes(16).toString('hex')}`;

    this.logger.log(`[DeveloperPlatform] Exchanged token for app '${app.name}' via grant '${grantType}'`);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600, // 1 hour TTL
      scope: issuedScopes.join(' '),
      refreshToken,
    };
  }

  /**
   * Generate OpenAPI 3.0 Specification JSON
   */
  generateOpenAPISpec(): Record<string, any> {
    return {
      openapi: '3.0.3',
      info: {
        title: 'NexusHub Enterprise Platform Public API',
        version: '1.0.0',
        description: 'OpenAPI 3.0 REST & GraphQL Gateway specification for NexusHub multi-tenant collaboration platform.',
      },
      servers: [{ url: 'https://api.nexushub.io/v1' }],
      paths: {
        '/channels': {
          get: { summary: 'List workspace channels', scopes: ['read:channels'] },
        },
        '/messages': {
          get: { summary: 'List channel messages', scopes: ['read:messages'] },
          post: { summary: 'Post new message', scopes: ['write:messages'] },
        },
        '/oauth/token': {
          post: { summary: 'OAuth 2.0 token endpoint' },
        },
      },
    };
  }
}
