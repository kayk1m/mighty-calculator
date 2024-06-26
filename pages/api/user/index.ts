import bcrypt from 'bcrypt';
import Joi from 'joi';
import { ObjectId } from 'mongodb';

import { SALT_ROUND } from '@defines/bcrypt';
import { createError } from '@defines/errors';
import { verifySession } from '@lib/server/verify-session';
import { connectMongo } from '@utils/mongodb/connect';
import { withErrorHandler } from '@utils/with-error-handler';

import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from 'types/user';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { userId } = verifySession(req, res, { renewSession: true });

    const { db } = await connectMongo();
    const user = await db.collection<User>('user').findOneAndUpdate(
      { _id: userId },
      { $set: { activatedAt: new Date() } },
      {
        projection: { _id: 1, name: 1, displayName: 1, email: 1, profileUrl: 1, activatedAt: 1 },
      },
    );

    if (!user) throw new Error('Cannot find user.');

    return res.json(user);
  }

  if (req.method === 'POST') {
    const userSchema = Joi.object({
      name: Joi.string().min(2).max(10).required(),
      displayName: Joi.string().min(3).max(20),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).max(30).required(),
    }).prefs({ errors: { label: 'key' } });

    const { name, displayName, email, password } = (await userSchema.validateAsync(
      req.body,
    )) as Pick<User, 'name' | 'displayName' | 'email' | 'password'>;

    const { db } = await connectMongo();
    const exUser = await db.collection<User>('user').findOne({ email });

    if (exUser) {
      return res.status(400).json(createError('USER_ALREADY_EXISTS'));
    }

    if (displayName) {
      const exDisplayName = await db.collection<User>('user').findOne({ displayName });

      if (exDisplayName) return res.status(400).json(createError('DISPLAYNAME_CONFLICT'));
    }

    await db.collection<User>('user').insertOne({
      _id: new ObjectId(),
      name,
      displayName: displayName || '',
      email,
      profileUrl: null,
      password: await bcrypt.hash(password, SALT_ROUND),
      stats5M: {
        president: {
          win: 0,
          lose: 0,
        },
        friend: { win: 0, lose: 0 },
        opposite: { win: 0, lose: 0 },
        optionalStats: {
          run: 0,
          backRun: 0,
          nogi: 0,
          nogiRun: 0,
          nogiBackRun: 0,
        },
      },
      stats6M: {
        president: {
          win: 0,
          lose: 0,
        },
        friend: { win: 0, lose: 0 },
        opposite: { win: 0, lose: 0 },
        died: 0,
        optionalStats: {
          run: 0,
          backRun: 0,
          nogi: 0,
          nogiRun: 0,
          nogiBackRun: 0,
        },
      },
      activatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: null,
    });

    return res.status(201).end();
  }

  if (req.method === 'PATCH') {
    const { userId } = verifySession(req, res);

    const bodySchema = Joi.object({
      displayName: Joi.string().label('displayName').min(2).max(20).required(),
    });

    const { displayName } = (await bodySchema.validateAsync(req.body)) as { displayName: string };

    const { db } = await connectMongo();

    const user = await db.collection<User>('user').findOne({ _id: userId });
    if (!user) throw new Error('Cannot find user.');

    if (displayName === user.displayName) {
      return res.status(304).end();
    }

    const exUser = await db.collection<User>('user').findOne({ displayName });
    if (exUser) {
      return res.status(400).json(createError('DISPLAYNAME_CONFLICT'));
    }
    await db
      .collection<User>('user')
      .updateOne({ _id: user._id }, { $set: { displayName, updatedAt: new Date() } });

    return res.status(204).end();
  }
};

export default withErrorHandler(handler);
