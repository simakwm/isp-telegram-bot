#!/bin/bash
pm2 stop bot
pm2 delete bot
pm2 start ./bot.js --merge-logs --log-date-format="DD/MM/YY HH:mm:ss"
pm2 logs
