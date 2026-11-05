export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  roleKeys: string[];
  permissionKeys: string[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
