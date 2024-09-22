import { NextFunction, Request, Response } from 'express'

export type UploadFileDb = {
  app: string;
  key: string;
  id: string;
  path: string;

  downloads: number;

  filename: string;
  fileurl: string;
  filesize: number;
  filetype: string;

  dataurl: string;
}

export type UploadFile = {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

export type Route = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>