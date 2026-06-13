
import os
f='/root/umami/docker-compose.yml'
c=open(f).read()
c=c.replace("- '3001:3000'", "- '100.89.48.10:3001:3000'")
open(f, 'w').write(c)

