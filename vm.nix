{ pkgs, config, lib, ... }:

{
  ### Make PaperWM available in system environment
  environment.systemPackages = with pkgs;
  [ paperwm
    (lib.getBin libinput)
  ];

  ### Set graphical session to GNOME (auto-login disabled for security)
  services.xserver =
  { enable = true;
    displayManager.autoLogin =
    { enable = false;
    };
    displayManager.gdm.enable = true;
    desktopManager.gnome.enable = true;
  };

  ### Set dconf to enable PaperWM out of the box
  programs.dconf =
  { enable = true;
    profiles."user".databases = [
      { settings =
        { "org/gnome/shell" =
          { enabled-extensions = [ "paperwm@paperwm.github.com" ];
            disable-user-extensions = false;
          };
        };
        #NOTE: You can add more dconf settings to test with here!
      }
    ];
  };

  ### Remove unnecessary dependencies
  #NOTE: This drops many GTK4 apps, re-enable if needed for testing.
  services.gnome.core-utilities.enable = false;

  ### Set default user (password locked for security, use 'sudo passwd user' to set test password)
  users.users."user" =
  { isNormalUser = true;
    createHome = true;
    home = "/home";
    description = "PaperWM test user";
  };

  ### Sudo requires password by default
  security.sudo =
  { enable = true;
  };
}
