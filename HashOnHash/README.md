# HashOnHash

Makes it easier to search for a lowest sha512 hash value.

The challenge was to find the hash whose hex value was the lowest -- the easiest way to check was to
find leading zeros. This code allows multiple instances to report back to a master.

Instructions:
--

Set up the master instance.

run the master script

PASS=<somepassword> I_AM_MASTER=true  MASTER_IP=<ip of this server> MASTER_PORT=3000 node server.js

Then run as many child scripts as you like, whereever you like

PASS=<somepassword> MASTER_IP=<ip of master server> MASTER_PORT=3000 node server.js

The current state of things is that the master just console.logs when a new leading zero is found.

