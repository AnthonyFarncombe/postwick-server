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

router.get("/notifications", (_req, res) => res.json(["alarm", "anpr", "water"]));

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

router.put("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.sendStatus(404);
      return;
    }

    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;
    user.email = req.body.email;
    user.hmiPin = req.body.hmiPin;
    user.roles = req.body.roles;
    user.notifications = req.body.notifications;

    await user.save();

    res.json(transformUser(user));
  } catch (err) {
    res.sendStatus(400);
  }
});

export default router;
