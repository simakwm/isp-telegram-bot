const config = require('./pluginConfig.json').GLPI;
// const _ = require('lodash');
const mysql = require('mysql');

// MySQL
const pool = mysql.createPool({
  host: config.mysqlOpts.host,
  user: config.mysqlOpts.username,
  password: config.mysqlOpts.password,
  database: config.mysqlOpts.database,
  connectionLimit: 10,
});

function resolveContent(id, isTask, callback) {
  if (!id) {
    return callback('Faltam ids!');
  }
  const tabela = isTask ? 'glpi_tickettasks' : 'glpi_ticketfollowups';
  const sql = `
  SELECT
    t.content
  FROM
    glpi.${tabela} t
  WHERE
    t.id = ${id}
  LIMIT 1`;
  pool.getConnection((errC, conex) => {
    if (errC) {
      return callback(errC);
    }
    conex.query(sql, (errQ, row) => {
      conex.release();
      if (errQ) {
        return callback(errQ);
      }
      return callback(null, row[0].content);
    });
    return null;
  });
  return null;
}

function verificaGlpi(target, actionId, callback) {
  const sql = `SELECT
      l.id,
      l.items_id,
      t.name,
      l.user_name,
      l.new_value,
      l.itemtype_link,
      l.date_mod,
      l.linked_action,
      l.id_search_option
    FROM
      glpi.glpi_logs l,
      glpi.glpi_tickets t
    WHERE
      l.itemtype="ticket"
    AND
      l.items_id=t.id
    AND
      l.user_name != "cron_mailgate"
    AND
      (l.id_search_option=24 OR l.itemtype_link="TicketFollowup" OR l.itemtype_link="TicketTask" OR l.linked_action=20)
    ORDER BY l.date_mod DESC LIMIT 1`;
  pool.getConnection((errC, conex) => {
    if (errC) {
      return callback(errC);
    }
    conex.query(sql, (errQ, row) => {
      conex.release();
      if (errQ) {
        // console.log(sql);
        return callback(errQ);
      }
      // verifica o que é
      const linha = row[0];
      // console.log(linha);
      let botReply;
      // chamado aberto
      if (linha.linked_action === 20) {
        botReply = `Novo chamado: ${linha.items_id} - ${linha.name}`;
        return callback(null, { botReply, status: true });
      }
      // acompanhamento
      if (linha.itemtype_link === 'TicketFollowup') {
        resolveContent(linha.new_value, false, (err, conteudo) => {
          if (err) {
            return callback(err);
          }
          botReply = `Acompanhamento de ${linha.items_id} "${linha.name}":\n${conteudo}`;
          return callback(null, { botReply, status: true });
        });
      }
      // tarefa
      if (linha.itemtype_link === 'TicketTask') {
        resolveContent(linha.new_value, true, (err, conteudo) => {
          if (err) {
            return callback(err);
          }
          botReply = `Tarefa do chamado #${linha.items_id} "${linha.name}":\n${conteudo}`;
          return callback(null, { botReply, status: true });
        });
      }
      // chamado encerrado
      if (linha.id_search_option === 24) {
        botReply = `Encerramento do chamado ${linha.items_id} "${linha.name}:\n${linha.new_value}"`;
        return callback(null, { botReply, status: true });
      }
      return null;
    });
    return null;
  });
  return null;
}

module.exports = {
  name: 'GLPI',
  help: 'comando: /glpi',
  regex: [
    { actionId: 0, regex: /^\/[Gg]lpi$/ },
  ],
  action: verificaGlpi,
  repeats: config.repeats,
  targets: config.targets,
  interval: config.interval,
};
