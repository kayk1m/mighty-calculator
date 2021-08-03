import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import Joi, { ValidationError } from 'joi';

import { verifySession } from '@lib/server/verify-session';
import { createError } from '@defines/errors';
import { withErrorHandler } from '@utils/with-error-handler';
import { connectMongo } from '@utils/connect-mongo';
import { getUserInfoById } from '@utils/user';
import { compareId } from '@lib/server/compare-id';
import { getRoomByQuery, isParticipant } from '@utils/room';

import { Room } from 'types/room';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const room = await getRoomByQuery(req, res);

  if (req.method === 'GET') {
    verifySession(req, res);

    return res.json(room);
  }

  if (req.method === 'PATCH') {
    const { userId } = verifySession(req, res);

    if (room.state === 'ended') return res.status(400).json(createError('ROOM_ENDED'));

    if (String(room.dealer._id) !== String(userId)) {
      return res.status(403).json(createError('NO_PERMISSION'));
    }

    const { dealerId } = (await Joi.object({
      dealerId: Joi.string().hex().length(24).required(),
    }).validateAsync(req.body)) as { dealerId: string };

    if (!ObjectId.isValid(dealerId) || !isParticipant(dealerId, room)) {
      throw new ValidationError('dealderId validation failed', '', '');
    }

    const dealer = await getUserInfoById(res, dealerId);

    const { db } = await connectMongo();

    await db
      .collection<Room>('room')
      .updateOne({ _id: room._id }, { $set: { dealer, updatedAt: new Date() } });

    return res.status(204).end();
  }

  if (req.method === 'DELETE') {
    const { userId } = verifySession(req, res);

    if (room.state === 'ended') return res.status(400).json(createError('ROOM_ENDED'));

    if (compareId(userId, room.dealer._id)) {
      return res.status(403).json(createError('NO_PERMISSION'));
    }

    const { db } = await connectMongo();

    await db
      .collection<Room>('room')
      .updateOne({ _id: room._id }, { $set: { deletedAt: new Date() } });

    return res.status(204).end();
  }
};

export default withErrorHandler(handler);