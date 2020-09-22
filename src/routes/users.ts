import express from "express";

import User, { UserType } from "../models/user";

const router = express.Router();

interface UserJson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  notifications: string[];
}

const transformUser = (user: UserType): UserJson => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  roles: user.roles,
  notifications: user.notifications,
});

router.get("/roles", (_req, res) => res.json(["users"]));

router.get("/", (_req, res) =>
  User.find()
    .then(users => res.json(users.map(u => transformUser(u))))
    .catch(() => res.sendStatus(400)),
);

router.get("/:id", (req, res) =>
  User.findById(req.params.id)
    .then(user => (user ? res.json(transformUser(user)) : res.sendStatus(404)))
    .catch(() => res.sendStatus(404)),
);

router.post("/", async (req, res) => {
  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    roles: req.body.roles,
    notifications: req.body.notifications,
  });

  try {
    const savedUser = await user.save();
    return res.json(transformUser(savedUser));
  } catch (e) {
    return res.sendStatus(400);
  }
});

router.put("/:id", (req, res) => res.json({ id: req.params.id, body: req.body }));

export default router;
