# w3strings-ng

This directory contains the optional `w3strings-ng` command-line decoder used by
the keymapper to decode Witcher 3 `.w3strings` localization files.

- Tool: `w3strings-ng`
- Source: https://github.com/Odashikonbu/w3strings-rust
- Author: Odashikonbu
- License: GPL-3.0-only
- Built from commit: `c785d7ee5d9f1d1b25249b0c5e4ed9aed7ae8e7b`
- Build command: `cargo build --release` from `cli-tools`

The Node app invokes this binary as an external tool; no Rust source code is
copied into the application.
