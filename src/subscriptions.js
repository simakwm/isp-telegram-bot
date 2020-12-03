const { findIndex, find, compact } = require('lodash')
const Aigle = require('aigle')

// Assina todos os usuários aos plugins
async function resubscribeAll () {
  try {
    IrisDb.find({}, async (error, docs) => {
      if (error) {
        throw error
      }
      await Aigle.resolve(docs).each(async (item) => {
        const msg = { chat: { id: item.chatId, username: item.username } }
        await subscribeAll(msg)
      }).then(() => {
        return Promise.resolve()
      })
    })
  } catch (error) {
    return Promise.reject(error)
  }
}

// Assina um usuário em todos os plugins
async function subscribeAll (msg) {
  try {
    console.log(`Assinando @${msg.chat.username} em todos os plugins...`)
    let botReply = ':bell: Você receberá notificações do(s) plugin(s): '
    // username não está na lista
    if (findIndex(userChat, ['username', msg.chat.username]) === -1) {
      userChat.push({ chatId: msg.chat.id, username: msg.chat.username })
      await Aigle.resolve(plugins).each(async (plugin) => {
        if (plugin.repeats) {
          const timer = setInterval(() => { temporizePlugin(plugin, msg) }, plugin.interval)
          const userIndex = findIndex(userChat, ['username', msg.chat.username])
          userChat[userIndex].timer = timer
          botReply += `\n:zap: ${plugin.name} - ${plugin.help}`
        }
      }).then(() => {
        bot.sendMessage(msg.chat.id, botReply)
        // remove itens vazios de userChat
        userChat = compact(userChat)
        // cria um objeto temporário igual a userChat, e remove o timer
        const tempChat = userChat
        const userIndex = findIndex(userChat, ['username', msg.chat.username])
        // Não dá para salvar o objeto do timer
        delete tempChat[userIndex].timer
        // procura id do registro para este username
        IrisDb.findOne({ username: msg.chat.username }, (errFind, doc) => {
          if (errFind) {
            throw errFind
          }
          if (doc) {
            console.log(`Registro de @${msg.chat.username} encontrado:`, doc._id)
            tempChat[userIndex]._id = doc._id
          }
          // Salva o documento do usuário
          const tempDoc = find(tempChat, ['username', msg.chat.username])
          // Remove documento(s) antigo(s) para evitar duplicidade
          IrisDb.remove({ username: msg.chat.username }, (err) => {
            if (err) {
              throw err
            }
            IrisDb.save(tempDoc, (errSave, newDoc) => {
              if (errSave) {
                console.log(errSave)
              }
              console.log(`Documento salvo para @${msg.chat.username}:`, newDoc._id)
              return Promise.resolve()
            })
          })
        })
      })
    } else {
      botReply = 'Você já está assinando aos plugins! Use "silêncio" para encerrar.'
      bot.sendMessage(msg.chat.id, botReply)
    }
  } catch (error) {
    return Promise.reject(error)
  }
}

// Cancela assinatura de um usuário para todos os plugins
async function unsubscribeAll (msg) {
  try {
    const userIndex = findIndex(userChat, ['username', msg.chat.username])
    if (userChat[userIndex]) {
      const timer = userChat[userIndex].timer
      clearInterval(timer)
      delete userChat[userIndex]
      console.log(`@${msg.chat.username} cancelou o timer.`)
      // remove do db
      IrisDb.remove({ username: msg.chat.username }, (err, num) => {
        if (err) {
          throw err
        }
        console.log(`${num} documento(s) removido(s) da persistência.`)
        bot.sendMessage(msg.chat.id, ':no_bell: Certo. Não vou mais incomodar.')
        return Promise.resolve()
      })
    } else {
      bot.sendMessage(msg.chat.id, 'Você não está assinando a nenhum plugin.')
      return Promise.resolve()
    }
  } catch (error) {
    return Promise.reject(error)
  }
}
