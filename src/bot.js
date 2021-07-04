/*
TODO:
* juntar comandos globais em uma função
* plugin.action should be async
*/

require('dotenv').config()
const TelegramBot = require('tgfancy') // wrapper para node-telegram-bot-api

const pluginPing = require('../pluginPING')
const pluginPRTG = require('../pluginPRTG')
// const pluginGLPI = require('../pluginGLPI')

const { subscribeAll, unsubscribeAll, resubscribeAll } = require('./subscriptions')
const { registerPlugin, showPlugins } = require('./plugin-system')
const { default: Aigle } = require('aigle')

// Telegram bot token
const { TOKEN } = process.env

const knownPlugins = [pluginPing, pluginPRTG]

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(TOKEN, {
  polling: true,
  tgfancy: {
    emojification: true // habilita emojificação automática de texto
  }
})

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id
  const resp = match[1]
  console.log(chatId)
  bot.sendMessage(chatId, `Você disse: "${resp}"`)
})

bot.onText(/^\/reboot$/, (msg) => {
  const chatId = msg.chat.id
  bot.sendMessage(chatId, ':joy::joy::joy::joy: Fala sério Kkkkkkkk')
})

bot.onText(/^\/doomsday$/, (msg) => {
  const chatId = msg.chat.id
  setTimeout(() => {
    bot.sendMessage(chatId, 'Reiniciando processo...')
    process.exit()
  }, 5000)
})

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  console.log(chatId)
  const botReply = `Olá, sou seu Telegram bot :v:
Estes são os comandos globais:
:bell: /incomode - Eu irei lhe enviar notificações de todos os plugins.
:no_bell: /silencio - Irei parar de enviar mensagens automáticas.
:repeat: /echo <texto> - Totalmente sem utilidade.
:warning: /reboot - Reinicia o bot.
:zap: /plugins - Lista plugins registrados no bot.`
  bot.sendMessage(chatId, botReply)
})

// Observa qualquer tipo de mensagem. Existem vários tipos
bot.on('message', (msg) => {
  console.log(`@${msg.chat.username}: ${msg.text}`)
})

// Comandos globais
bot.onText(/\/[i]ncomode/, subscribeAll)
bot.onText(/^[Ii]nc$/, subscribeAll)
bot.onText(/\/[s]il[êe]ncio/, unsubscribeAll)
bot.onText(/^[Ss]il$/, unsubscribeAll)
bot.onText(/\/plugins/, showPlugins)



async function main () {
  console.log('Inciando bot...')
  Aigle.resolve(knownPlugins).each(async (plugin) => {
    await registerPlugin({ plugin })
  }).then(async () => {
    await resubscribeAll({ bot, plugins }) // Renova assinatura dos usuários para todos os plugins
  })
}

main().then(() => {
  console.log('done')
}).catch((e) => {
  console.error(e)
})
