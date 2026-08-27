declare global {
  namespace Express {
    interface Request {
      user?: {
        id:    string;
        name:  string;
        email: string;
        role:  'ADMIN' | 'LAB_INCHARGE' | 'STUDENT';
      };
    }
  }
}

export {};