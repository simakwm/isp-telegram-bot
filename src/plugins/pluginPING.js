const ping = require('ping')
const config = require('./pluginConfig.json').PING
const _ = require('lodash')
const async = require('async')

function executaPing (host, actionId, callback) {
  let msgResposta = 'Falhou :worried:'
  // let botReply;
  if (actionId === 0) {
    return callback(null, { botReply: 'Especifique um host.', status: true })
  }
  if (host === 'list' || actionId === 2) {
    let lista = []
    async.each(config.targets, (item, cb) => {
      ping.sys.probe(item, (respondeu) => {
        lista.push({ host: item, respondeu })
        cb()
      })
    }, () => {
      lista = lista.map(item => `${item.respondeu ? ':thumbsup:' : ':thumbsdown:'} ${item.host}`)
      lista = lista.toString()
      lista = _.replace(lista, /,/g, '\n')
      return callback(null, { botReply: lista, status: true })
    })
    return null
  }
  if (!host) {
    return callback('Host vazio')
  }
  // ping list
  ping.sys.probe(host, (respondeu) => {
    if (respondeu) {
      msgResposta = 'Sucesso :smiley:'
    }
    const resposta = { botReply: `Ping para ${host}: ${msgResposta}`, status: respondeu }
    return callback(null, resposta)
  })
  return null
}

module.exports = {
  name: 'PING',
  help: 'comandos: /ping <host>, /pinglist',
  regex: [
    { actionId: 0, regex: /^\/[Pp]ing$/ },
    { actionId: 1, regex: /^\/[Pp]ing (.+)/ },
    { actionId: 2, regex: /^\/[Pp]inglist$/ }
  ],
  // { actionId: 2, regex: /^\/[Pp]inglist$/ }],
  action: executaPing,
  repeats: config.repeats,
  targets: config.targets,
  interval: config.interval
}
