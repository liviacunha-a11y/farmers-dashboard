// backend/actions/email.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const nodemailer = require('nodemailer')
const { registerActivity } = require('../pipedriveClient')

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

async function executeEmail({ dealId, orgId, orgName, email, farmerName }) {
  const subject = `Retomando contato — ${orgName}`
  const text = `Olá ${orgName},\n\nPassando para retomar nossa parceria. Podemos conversar esta semana?\n\nAbraços,\n${farmerName}\nSeazone Parcerias`

  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text,
  })

  await registerActivity({
    dealId,
    orgId,
    type: 'email',
    note: `Email enviado via dashboard Farmers para ${email}: "${subject}"`,
  })

  return { message: 'Email enviado — registrado no Pipedrive' }
}

module.exports = { executeEmail, createTransporter }
