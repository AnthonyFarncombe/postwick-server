import jwt from 'jsonwebtoken';

export interface JwtData {
  exp: number;
  userId: string;
  email: string;
  roles: string[];
  ip: string;
}

export function getUserFromToken(bearerHeader: string): Promise<string | object> {
  return new Promise((resolve, reject): void => {
    try {
      if (!bearerHeader || typeof bearerHeader !== 'string') return reject();
      const bearer = bearerHeader.split(' ');
      const bearerToken = bearer[1];

      jwt.verify(bearerToken, process.env.JWT_SECRET || 'secret', (err, decoded) => {
        if (err) return reject(err);

        const jwtData = decoded as JwtData;

        if (decoded && jwtData.exp && Date.now() < jwtData.exp * 1000) {
          resolve(decoded);
        } else {
          reject(new Error('JWT token has expired!'));
        }
      });
    } catch (err) {
      return reject(err);
    }
  });
}
