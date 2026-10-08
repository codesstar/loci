'use strict';
const fs = require('fs');
const path = require('path');
const { buildContext } = require('../../../../scripts/loci-context');

function chatContext(brain) {
  const entry = fs.readFileSync(path.join(brain, 'LOCI.md'), 'utf8').replaceAll('<brain-path>', () => brain.split(path.sep).join('/'));
  return [
    '你在 Loci Dashboard 的文字聊天窗口中，当前工作目录就是本次使用的大脑。',
    '用户只能发文字。需要检查文件时使用自己的工具；回复简短，用户问技术细节时再解释。',
    entry, buildContext({ brain, workspace: brain }),
    '用户消息：'
  ].join('\n\n');
}
module.exports = { chatContext };
