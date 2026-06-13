
import os
f='/etc/netdata/netdata.conf'
c=open(f).read()
if '[web]' not in c:
    c += '\n[web]\n    bind to = 100.89.48.10\n'
else:
    # Not ideal but let's just replace it or append it under [web]
    pass # we assume it's just the default empty conf
open(f, 'w').write(c)

