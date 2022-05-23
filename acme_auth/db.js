const { JsonWebTokenError } = require("jsonwebtoken");
const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

// Associations
Note.belongsTo(User);
User.hasMany(Note);

User.beforeCreate(async (user) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(user.password, saltRounds);
  user.password = hashedPassword;
});

User.byToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT);

  try {
    const user = await User.findByPk(decoded.userId);
    if (user) {
      return decoded;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  const isMatched = await bcrypt.compare(password, user.password);

  if (isMatched) {
    const token = jwt.sign({ userId: user.id }, process.env.JWT);
    console.log("Good credentials");
    return token;
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const notes = [{ text: "Note1" }, { text: "Note2" }, { text: "Note3" }];
  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
    console.log(User.prototype)
  await lucy.setNotes([note1, note2]);
  await moe.setNotes([note3]);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};
