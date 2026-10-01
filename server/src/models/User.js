import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

export const ROLES = ['USER', 'ADMIN']

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // select:false => the hash is never loaded unless a query explicitly asks for it
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ROLES, default: 'USER' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = String(ret._id)
        delete ret._id
        delete ret.__v
        delete ret.password
        return ret
      },
    },
  },
)

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

export const hashPassword = (plain) => bcrypt.hash(plain, 12)

export const User = mongoose.model('User', userSchema)
