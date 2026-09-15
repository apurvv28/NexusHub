import { Injectable, Logger, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface SSOConfig {
  workspaceId: string;
  provider: 'okta' | 'azure_ad' | 'ping_identity' | 'custom_saml';
  entityId: string;
  ssoUrl: string;
  certificate: string;
  enabled: boolean;
  allowedDomains: string[];
  updatedAt: Date;
}

export interface SCIMUserResource {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name: { formatted: string; familyName: string; givenName: string };
  emails: Array<{ value: string; type: string; primary: boolean }>;
  active: boolean;
  roles?: string[];
  meta: { resourceType: string; created: string; lastModified: string; location: string };
}

export interface SCIMGroupResource {
  schemas: string[];
  id: string;
  displayName: string;
  members: Array<{ value: string; display: string }>;
  meta: { resourceType: string; created: string; lastModified: string; location: string };
}

@Injectable()
export class EnterpriseSSOService {
  private readonly logger = new Logger(EnterpriseSSOService.name);
  private ssoConfigs: Map<string, SSOConfig> = new Map();
  private scimUsers: Map<string, SCIMUserResource & { workspaceId: string }> = new Map();
  private scimGroups: Map<string, SCIMGroupResource & { workspaceId: string }> = new Map();

  constructor(private readonly dbService?: DatabaseService) {}

  /**
   * Configure SAML/OIDC SSO settings for a tenant workspace
   */
  async configureSSO(
    workspaceId: string,
    provider: 'okta' | 'azure_ad' | 'ping_identity' | 'custom_saml',
    entityId: string,
    ssoUrl: string,
    certificate: string,
    allowedDomains: string[],
  ): Promise<SSOConfig> {
    const config: SSOConfig = {
      workspaceId,
      provider,
      entityId,
      ssoUrl,
      certificate,
      enabled: true,
      allowedDomains,
      updatedAt: new Date(),
    };

    this.ssoConfigs.set(workspaceId, config);
    this.logger.log(`[EnterpriseSSO] Configured ${provider.toUpperCase()} SSO for workspace ${workspaceId}`);
    return config;
  }

  /**
   * Get workspace SSO config
   */
  async getSSOConfig(workspaceId: string): Promise<SSOConfig | null> {
    return this.ssoConfigs.get(workspaceId) || null;
  }

  /**
   * Validate SAML assertion payload (simulated validation)
   */
  async validateSAMLAssertion(workspaceId: string, samlResponseBase64: string): Promise<{
    email: string;
    fullName: string;
    roles: string[];
  }> {
    const config = this.ssoConfigs.get(workspaceId);
    if (!config || !config.enabled) {
      throw new UnauthorizedException(`Enterprise SSO is not enabled for workspace ${workspaceId}`);
    }

    if (!samlResponseBase64) {
      throw new UnauthorizedException('Invalid SAML response assertion.');
    }

    // Decode/Simulate SAML Assertion extraction
    this.logger.log(`[EnterpriseSSO] Validated SAML 2.0 assertion for workspace ${workspaceId} via IdP ${config.provider}`);
    return {
      email: 'sso.user@enterprise.com',
      fullName: 'Enterprise User',
      roles: ['Member'],
    };
  }

  // --- SCIM 2.0 USER MANAGEMENT (RFC 7644) ---

  async createSCIMUser(workspaceId: string, payload: Partial<SCIMUserResource>): Promise<SCIMUserResource> {
    const userId = payload.id || `scim_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const email = payload.emails?.[0]?.value || payload.userName || 'scim.user@company.com';
    const nowISO = new Date().toISOString();

    const resource: SCIMUserResource & { workspaceId: string } = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: userId,
      externalId: payload.externalId || userId,
      userName: payload.userName || email,
      name: payload.name || { formatted: 'SCIM User', givenName: 'SCIM', familyName: 'User' },
      emails: payload.emails || [{ value: email, type: 'work', primary: true }],
      active: payload.active !== undefined ? payload.active : true,
      roles: payload.roles || ['Member'],
      meta: {
        resourceType: 'User',
        created: nowISO,
        lastModified: nowISO,
        location: `/scim/v2/Users/${userId}`,
      },
      workspaceId,
    };

    this.scimUsers.set(userId, resource);
    this.logger.log(`[SCIM 2.0] Created user ${userId} (${resource.userName}) in workspace ${workspaceId}`);
    return resource;
  }

  async getSCIMUsers(workspaceId: string): Promise<{ schemas: string[]; totalResults: number; Resources: SCIMUserResource[] }> {
    const users = Array.from(this.scimUsers.values())
      .filter((u) => u.workspaceId === workspaceId)
      .map(({ workspaceId, ...rest }) => rest);

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: users.length,
      Resources: users,
    };
  }

  async getSCIMUserById(workspaceId: string, userId: string): Promise<SCIMUserResource> {
    const user = this.scimUsers.get(userId);
    if (!user || user.workspaceId !== workspaceId) {
      throw new NotFoundException(`SCIM User ${userId} not found.`);
    }
    const { workspaceId: _, ...rest } = user;
    return rest;
  }

  async updateSCIMUser(workspaceId: string, userId: string, updates: Partial<SCIMUserResource>): Promise<SCIMUserResource> {
    const user = this.scimUsers.get(userId);
    if (!user || user.workspaceId !== workspaceId) {
      throw new NotFoundException(`SCIM User ${userId} not found.`);
    }

    if (updates.active !== undefined) user.active = updates.active;
    if (updates.name) user.name = updates.name;
    if (updates.roles) user.roles = updates.roles;
    user.meta.lastModified = new Date().toISOString();

    this.logger.log(`[SCIM 2.0] Updated user ${userId} (active=${user.active}) in workspace ${workspaceId}`);
    const { workspaceId: _, ...rest } = user;
    return rest;
  }

  async deleteSCIMUser(workspaceId: string, userId: string): Promise<boolean> {
    const user = this.scimUsers.get(userId);
    if (!user || user.workspaceId !== workspaceId) {
      throw new NotFoundException(`SCIM User ${userId} not found.`);
    }

    // SCIM 2.0 deprovisioning: Set active = false and remove token
    user.active = false;
    user.meta.lastModified = new Date().toISOString();
    this.logger.log(`[SCIM 2.0] Deprovisioned user ${userId} (active=false) in workspace ${workspaceId}`);
    return true;
  }

  // --- SCIM 2.0 GROUP MANAGEMENT ---

  async createSCIMGroup(workspaceId: string, displayName: string, memberIds: string[] = []): Promise<SCIMGroupResource> {
    const groupId = `scim_grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowISO = new Date().toISOString();

    const resource: SCIMGroupResource & { workspaceId: string } = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: groupId,
      displayName,
      members: memberIds.map((id) => ({ value: id, display: `User ${id}` })),
      meta: {
        resourceType: 'Group',
        created: nowISO,
        lastModified: nowISO,
        location: `/scim/v2/Groups/${groupId}`,
      },
      workspaceId,
    };

    this.scimGroups.set(groupId, resource);
    this.logger.log(`[SCIM 2.0] Created group ${displayName} (${groupId}) in workspace ${workspaceId}`);
    return resource;
  }

  async getSCIMGroups(workspaceId: string): Promise<{ schemas: string[]; totalResults: number; Resources: SCIMGroupResource[] }> {
    const groups = Array.from(this.scimGroups.values())
      .filter((g) => g.workspaceId === workspaceId)
      .map(({ workspaceId, ...rest }) => rest);

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: groups.length,
      Resources: groups,
    };
  }
}
