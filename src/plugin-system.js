const Aigle = require('aigle')

const ERRO = 'Agora fudeu tudo \u{1F632}'
const plugins = []

async function registraRegex ({ bot, plugin }) {
  try {
    await Aigle.resolve(plugin.regex).each(async (regex) => {
      bot.onText(regex.regex, async (msg, match) => {
        const chatId = msg.chat.id
        const target = match[1]
        plugin.action(target, regex.actionId, (error, resp) => {
          if (error) {
            console.error(error)
            bot.sendMessage(chatId, ERRO)
            return Promise.resolve(false)
          }
          console.log(`[${plugin.name}] ${resp.botReply}`)
          bot.sendMessage(chatId, resp.botReply)
        })
      })
    }).then(() => {
      return Promise.resolve(true)
    })
  } catch (error) {
    return Promise.reject(error)
  }
}

// Registra o regex e a ação do plugin
async function registerPlugin ({ bot, plugin }) {
  try {
    if (!plugin.name || !plugin.regex || !plugin.action) {
      throw new Error(`Something is wrong with this plugin: ${plugin}`)
    }
    const success = registraRegex({ bot, plugin })
    if (!success) {
      return Promise.resolve(false)
    }
    plugins.push(plugin)
    console.log(`[${plugin.name}] registrado com sucesso.`)
    return Promise.resolve(true)
  } catch (error) {
    return Promise.reject(error)
  }
}

// Cria timer para ações que repetem
async function temporizePlugin ({ bot, plugin, msg }) {
  try {
    if (msg.chat.id) {
      // console.log(`${agora()} Ação temporizada de ${plugin.name} para @${msg.chat.username}`);
      await Aigle.resolve(plugin.targets).each(async (target) => {
        plugin.action(target, 1, (error, resp) => {
          if (error) {
            console.error(error)
          } else {
            if (resp.status === false) {
              // Envia a resposta do plugin para assinantes do plugin
              console.log(resp.botReply)
              bot.sendMessage(msg.chat.id, resp.botReply)
            }
          }
        })
      }).then(() => {
        return Promise.resolve()
      })
    }
  } catch (error) {
    return Promise.reject(error)
  }
}

async function showPlugins ({ bot, msg }) {
  try {
    let botReply = 'Plugins registrados:\n'
    await Aigle.resolve(plugins).eachSeries(async (item) => {
      botReply += `:zap: ${item.name}\n`
    }).then(() => {
      bot.sendMessage(msg.chat.id, botReply)
      return Promise.resolve()
    })
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = { showPlugins, registerPlugin, temporizePlugin }
