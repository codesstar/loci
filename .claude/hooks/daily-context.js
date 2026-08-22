#!/usr/bin/env node
'use strict';

// Project-level Claude Code SessionStart wrapper. The global wrapper notices
// this file and skips itself, so the compact context is injected only once.

require('./loci-context').run({ skipProjectHook: false });
