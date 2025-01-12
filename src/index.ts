import { StrategyVerifyCallback } from 'remix-auth';

import {
    OAuth2Profile,
    OAuth2Strategy,
    OAuth2StrategyVerifyParams,
} from 'remix-auth-oauth2';

/**
 * @see https://learn.microsoft.com/en-us/azure/active-directory/develop/scopes-oidc#openid-connect-scopes
 */
export type MicrosoftScope = 'openid' | 'email' | 'profile' | 'offline_access';

export interface MicrosoftStrategyOptions {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope?: MicrosoftScope[] | string;
    tenantId?: string;
    prompt?: string;
}

export interface MicrosoftProfile extends OAuth2Profile {
    id: string;
    displayName: string;
    name: {
        familyName: string;
        givenName: string;
    };
    emails: [{ value: string }];
    _json: {
        sub: string;
        name: string;
        family_name: string;
        given_name: string;
        email: string;
    };
}

export interface MicrosoftExtraParams extends Record<string, string | number> {
    expires_in: 3599;
    token_type: 'Bearer';
    scope: string;
    id_token: string;
}

export const MicrosoftStrategyDefaultScopes: MicrosoftScope[] = [
    'openid',
    'profile',
    'email',
];
export const MicrosoftStrategyDefaultName = 'microsoft';
export const MicrosoftStrategyScopeSeperator = ' ';

export class MicrosoftStrategy<User> extends OAuth2Strategy<
    User,
    MicrosoftProfile,
    MicrosoftExtraParams
> {
    name = MicrosoftStrategyDefaultName;

    private scopeString: string; // Changed to string type
    private prompt: string;
    private userInfoURL = 'https://graph.microsoft.com/oidc/userinfo';

    constructor(
        {
            clientId,
            clientSecret,
            redirectUri,
            scope,
            prompt,
            tenantId = 'common',
        }: MicrosoftStrategyOptions,
        verify: StrategyVerifyCallback<
            User,
            OAuth2StrategyVerifyParams<MicrosoftProfile, MicrosoftExtraParams>
        >
    ) {
        super(
            {
                clientID: clientId,
                clientSecret,
                callbackURL: redirectUri,
                authorizationURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
                tokenURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            },
            verify
        );

        this.scopeString = this.getScope(scope); // Store as a string
        this.prompt = prompt ?? 'none';
    }

    // Function to get scope string
    private getScope(scope: MicrosoftStrategyOptions['scope']): string {
        if (!scope) {
            return MicrosoftStrategyDefaultScopes.join(
                MicrosoftStrategyScopeSeperator
            );
        } else if (typeof scope === 'string') {
            return scope;
        }

        return scope.join(MicrosoftStrategyScopeSeperator);
    }

    protected authorizationParams() {
        return new URLSearchParams({
            scope: this.scopeString, // Use the string version of scope
            prompt: this.prompt,
        });
    }

    protected async userProfile(
        accessToken: string
    ): Promise<MicrosoftProfile> {
        const response = await fetch(this.userInfoURL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const data: MicrosoftProfile['_json'] = await response.json();

        const profile: MicrosoftProfile = {
            provider: MicrosoftStrategyDefaultName,
            displayName: data.name,
            id: data.sub,
            name: {
                familyName: data.family_name,
                givenName: data.given_name,
            },
            emails: [{ value: data.email }],
            _json: data,
        };

        return profile;
    }
}
