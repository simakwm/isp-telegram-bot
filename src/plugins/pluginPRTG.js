const request = require('request')
const async = require('async')
const _ = require('lodash')
const Prune = require('underscore.string').prune
const config = require('./pluginConfig.json').PRTG

const USERNAME = config.httpOpts.username
const PASSHASH = config.httpOpts.passhash
const PRTG_URL = `${config.httpOpts.baseUrl}${config.httpOpts.apiPath}&username=${USERNAME}&passhash=${PASSHASH}`

function prtgDowned (target, actionId, callback) {
  const ignoreList = config.ignoreList
  request.get(PRTG_URL, (error, response, body) => {
    if (error) {
      return callback(error)
    }
    if (_.isEmpty(body)) {
      return callback('Corpo do resultado da requisição vazio!')
    }
    // Processa JSON e faz algumas verificações
    let resultado
    try {
      resultado = JSON.parse(body)
    } catch (SyntaxError) {
      return callback('Erro de interpretação do resultado da requisição!')
    }
    resultado = resultado['']
    // armazena tamanho do resultado original para saber se tem itens ignorados
    const tamanhoResultadoOriginal = resultado.length
    let botReply
    // Remove itens ignorados
    async.each(ignoreList, (ignoreItem, cb) => {
      _.remove(resultado, value => String(value.objid).match(ignoreItem) !== null)
      cb()
    }, () => {
    })
    // executou /quantos
    if (actionId === 1 && resultado.length > 0) {
      // let gruposEnvolvidos = [];
      let dispositivosParados = resultado.map((item) => {
        // gruposEnvolvidos.push(item.group);
        let lastup
        if (item.lastup === '-') {
          lastup = 'nunca'
        } else {
          lastup = `${item.lastup.split(' ')[0]} ${item.lastup.split(' ')[1]}`
        }
        return `:red_circle:${item.group} - ${Prune(item.device, 30)} desde ${lastup} \n`
      })
      dispositivosParados = _.uniq(dispositivosParados) // remove duplicados
      dispositivosParados = dispositivosParados.toString()
      dispositivosParados = _.replace(dispositivosParados, /,/g, '')
      dispositivosParados = _.trim(dispositivosParados)
      /* if (dispositivosParados.length >= 4096) {
        gruposEnvolvidos = _.uniq(gruposEnvolvidos);
        dispositivosParados = `A mensagem ficou muito grande.
        Verifique os grupos: ${gruposEnvolvidos}`;
      } */
      botReply = `Resumo dos dispositivos parados:\n${dispositivosParados}`
      return callback(null, { botReply, status: false })
    }
    // Se existem sensores parados, mas algum está sendo ignorado
    if (resultado.length === 0) {
      botReply = 'Nenhum sensor parado';
      if (tamanhoResultadoOriginal > 0) {
        botReply += ', exceto os ignorados :grimacing:';
      }
      return callback(null, { botReply, status: true })
    }
    botReply = `Quantidade de sensores parados: ${resultado.length}.`
    return callback(null, { botReply, status: false })
  })
}

module.exports = {
  name: 'PRTG',
  help: 'comandos: /prtg, /quantos',
  regex: [
    { actionId: 1, regex: /[Pp]rtg$/ },
    { actionId: 2, regex: /\/[Qq]uantos$/ }
  ],
  action: prtgDowned,
  repeats: config.repeats,
  targets: config.targets,
  interval: config.interval
}
