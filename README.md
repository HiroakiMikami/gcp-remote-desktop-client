# gcp-remote-desktop-client
The utility command line tool to use a VM of GCP Compute Engine as a Linux desktop.

## Motivation
Machine resource required to conduct development tasks is different depending on the tasks. For example, compiling the multiple C++ files requires many CPUs, but processing large-scale data requires mass memory.
The public cloud (such as AWS and GCP) is useful to handle these situations because it's easy to configure the machine resource of the VM. However, the VM of the public cloud is usually more expensive than the bare-metal machine.

This command line tool reduces the GCP cost by

1. terminating VMs when shutting-down,
2. using preemptible instance when possible, and
3. restore data from the snapshot if the permanent disk is not available.

## Install
```bash
$ git clone git@github.com:HiroakiMikami/gcp-remote-desktop-client.git
$ cd gcp-remote-desktop-client
$ npm install .
$ npm run compile
$ npm link
$ cp <service-account-credentials> ~/.gcp-remote-desktop-client.json
```

The detail of the last line (authentification) is [here](https://cloud.google.com/docs/authentication/getting-started#auth-cloud-implicit-nodejs).


## Example
### 1. Prepare VM (the persistent disk)
1. Create the persistent disk from the image of Ubuntu 16.04
2. Create the VM using the created disk as a boot disk
3. Log-in to the VM via ssh
4. Setup vncserver by following commands:
    ```bash
    $ sudo apt-get update
    $ sudo apt-get install vnc4server
    $ vncpasswd
    $ vncserver :1
    $ echo << EOF > /etc/systemd/system/vncserver@.service
    [Unit]
    Description=Start TightVNC server at startup
    After=syslog.target network.target

    [Service]
    Type=forking
    User=<UserName>
    Group=<GroupName>
    WorkingDirectory=${HOME}

    ExecStart=/usr/bin/vncserver -depth 24 -geometry 1280x800 :%i
    ExecStop=/usr/bin/vncserver -kill :%i

    [Install]
    WantedBy=multi-user.target
    EOF
    $ sudo systemctl daemon-realod
    $ sudo systemctl start vncserver@1
    $ sudo shutdown -h now
    ```

### 2. Use the persistent disk by using this tool
```bash
$ gcp-remote-desktop-client --disk-name <DiskName> vnc-with-ssh :1 \
    --ssh-timeout-time 60 \
    --ssh-wait-after-success-time 10 \
    --machine-type n1-standard-1 \
    --zone <GCPZone> \
    --ssh i=<private-key>
```


## Options
TODO


## Config Files
TODO