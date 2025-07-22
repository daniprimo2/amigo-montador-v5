import { Request, Response, NextFunction } from 'express';
// Middleware para salvar rawBody
export function rawBodySaver(req: any, res: any, buf: Buffer, encoding: BufferEncoding) {
  if (buf && buf.length) {
    req.rawBody = buf;
  }
}
