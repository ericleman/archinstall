-- ========================================================================== --
-- ==                           EDITOR SETTINGS                            == --
-- ========================================================================== --

vim.opt.number = true
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.softtabstop = 0
vim.opt.expandtab = true

-- ========================================================================== --
-- ==                             KEYBINDINGS                              == --
-- ========================================================================== --
-- Space as leader key
vim.g.mapleader = ' '


-- ========================================================================== --
-- ==                               PLUGINS                                == --
-- ========================================================================== --

require('packer').startup(function(use)
  -- Packer can manage itself
  use 'wbthomason/packer.nvim'
  use {
    'nvim-lualine/lualine.nvim',
    requires = { 'kyazdani42/nvim-web-devicons', opt = true }
  }
  use 'tiagofumo/vim-nerdtree-syntax-highlight'
  use 'kyazdani42/nvim-web-devicons'
  use 'kyazdani42/nvim-tree.lua'
end)

-- ========================================================================== --
-- ==                         PLUGIN CONFIGURATION                         == --
-- ========================================================================== --
require('lualine').setup()

-- ============================================================================
require('nvim-tree').setup({
  hijack_cursor = false,
  on_attach = function(bufnr)
    local bufmap = function(lhs, rhs, desc)
      vim.keymap.set('n', lhs, rhs, {buffer = bufnr, desc = desc})
    end

    -- See :help nvim-tree.api
    local api = require('nvim-tree.api')
   
    bufmap('L', api.node.open.edit, 'Expand folder or go to file')
    bufmap('H', api.node.navigate.parent_close, 'Close parent folder')
    bufmap('gh', api.tree.toggle_hidden_filter, 'Toggle hidden files')
  end
})

vim.keymap.set('n', '<leader>e', '<cmd>NvimTreeToggle<cr>')

