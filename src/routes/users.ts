import express from 'express';
import bcrypt from 'bcryptjs';
import User, { UserType } from '../models/user';

const router = express.Router();

interface UserJson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

function UserToJson(user: UserType): UserJson {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    roles: user.roles,
  };
}

router.get('/', async (_req, res) => {
  const users = await User.find();
  res.json(users.map(u => UserToJson(u)));
});

router.post('/create', async (req, res) => {
  if (!req.body) return res.status(400);

  const { firstName, lastName, email, roles } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400);
  }

  const password = Math.random()
    .toString(30)
    .slice(-10);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = new User({
    firstName,
    lastName,
    email,
    passwordHash,
    roles,
  });

  try {
    await user.save();
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ errmsg: 'This email address already exists!' });
    return res.status(500).json(err);
  }

  return res.json(UserToJson(user));
});

// router.post('/update', (req, res) => {
//   if (!req.body) return res.status(400);

//   const { id, firstName, lastName, email, roles } = req.body;
//   if (!firstName || !lastName || !email) {
//     return res.status(400);
//   }
// });

export default router;
