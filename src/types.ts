import { NextFunction, Request, Response } from 'express'

export type UploadFileDb = {
  app: string;
  key: string;
  id: string;
  path: string;
  suffixId: string;

  downloads: number;

  filename: string;
  filesize: number;
  filetype: string;
}

export type UploadFile = {
  filename: string;
  suffixId: string;
  size: number;
  mimetype: string;
}

export type Route = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>