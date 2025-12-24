{
  description = "Development environment for website project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        nodejs = pkgs.nodejs_22;
        devTools = with pkgs; [
          nodejs
          nodePackages.npm
          nodePackages.typescript
          docker
          docker-compose
          postgresql_16
          pgadmin4
          neovim
          git
          curl
          wget
          bashInteractive
          coreutils
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = devTools;
          
          # Isolated environment - only packages from this flake are available
          # Uncomment to make the shell pure (no access to system packages  (FOR NIX USERS)
          # pure = true; 

          shellHook = ''
            echo "🚀 Website Development Environment"
            echo "Node.js version: $(node --version)"
            echo "npm version: $(npm --version)"
            echo "Neovim version: $(nvim --version | head -n1)"
            echo "Docker version: $(docker --version 2>/dev/null || echo 'Docker daemon not running')"
            echo "PostgreSQL version: $(postgres --version 2>/dev/null || echo 'PostgreSQL not started')"
            echo ""
            echo "Available commands:"
            echo "  npm install    - Install dependencies"
            echo "  npm run dev    - Start development server"
            echo "  npm run lint   - Run linter"
            echo "  npm run website - Build and run Docker container"
            echo "  npm run logs   - View Docker container logs"
            echo ""
            echo "Database commands:"
            echo "  pg_ctl start   - Start PostgreSQL server"
            echo "  pg_ctl stop    - Stop PostgreSQL server"
            echo "  pgadmin4       - Launch pgAdmin web interface"
            echo ""
            echo "💡 Tip: Run 'check-nix-env' to verify you're in the Nix environment"
            echo ""
            
            # Helper function to check if in Nix environment
            check-nix-env() {
              if [ -n "$IN_NIX_SHELL" ]; then
                echo "✅ You ARE in the Nix development environment"
                echo "   IN_NIX_SHELL=$IN_NIX_SHELL"
              else
                echo "❌ You are NOT in the Nix development environment"
                echo "   Run 'nix develop' to enter it"
              fi
            }
            
            # Set NODE_OPTIONS for debugging if needed
            export NODE_OPTIONS="--inspect"
            
            # Uncomment the lines below if you want automatic LazyVim setup
            # if [ ! -d ~/.config/nvim ]; then
            #   echo "Setting up LazyVim..."
            #   git clone https://github.com/LazyVim/starter ~/.config/nvim
            # fi
          '';

          NODE_ENV = "development";
        };
      }
    );
}

