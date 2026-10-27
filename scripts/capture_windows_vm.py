"""Read an owned Windows VM's VNC framebuffer without publishing its VNC port.

Diagnostic only: no keyboard, mouse, clipboard, browser navigation or grants.
The VM must be a labelled Sentinel Loop Windows container.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile

# Runs inside the isolated Windows runner. Only QEMU's local display is read.
CAPTURE = r'''
import socket,struct
s=socket.create_connection(('127.0.0.1',5901),10);s.settimeout(20)
def read(n):
 result=bytearray()
 while len(result)<n:
  part=s.recv(n-len(result))
  if not part:raise RuntimeError('Display disconnected')
  result.extend(part)
 return bytes(result)
assert read(12).startswith(b'RFB ')
s.sendall(b'RFB 003.008\n')
security=read(read(1)[0]);assert 1 in security
s.sendall(b'\x01');assert read(4)==b'\x00'*4
s.sendall(b'\x01')
header=read(24);width,height=struct.unpack('>HH',header[:4]);name_len=struct.unpack('>I',header[20:24])[0]
assert 0<width<=4096 and 0<height<=4096 and name_len<=4096
read(name_len)
pixel=struct.pack('>BBBBHHHBBBxxx',32,24,0,1,255,255,255,16,8,0)
s.sendall(b'\x00\x00\x00\x00'+pixel)
s.sendall(struct.pack('>BBHi',2,0,1,0))
s.sendall(struct.pack('>BBHHHH',3,0,0,0,width,height))
rgb=bytearray(width*height*3);updated=False
for update in range(64):
 kind=read(1)[0]
 if kind==2:continue
 if kind!=0:raise RuntimeError('Unexpected display update')
 count=struct.unpack('>xH',read(3))[0]
 if count>256:raise RuntimeError('Too many display rectangles')
 for rectangle in range(count):
  x,y,w,h,encoding=struct.unpack('>HHHHi',read(12))
  if encoding!=0 or x+w>width or y+h>height:raise RuntimeError('Invalid raw display rectangle')
  data=read(w*h*4)
  for row in range(h):
   source=data[row*w*4:(row+1)*w*4];line=bytearray(w*3)
   line[0::3]=source[2::4];line[1::3]=source[1::4];line[2::3]=source[0::4]
   at=((y+row)*width+x)*3;rgb[at:at+w*3]=line
  updated=True
 if updated:break
if not updated:raise RuntimeError('No display pixels received')
with open('/vm/diagnostic.ppm','wb') as output:output.write(('P6\n%d %d\n255\n'%(width,height)).encode()+rgb)
s.close()
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("container")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    # The system Python provides Pillow on the supported local setup. Fail
    # before any container action when the chosen interpreter lacks it.
    from PIL import Image
    info = json.loads(subprocess.check_output(["docker", "inspect", args.container]))[0]
    if info["Config"]["Image"] != "cydeline-windows:1" or not info["Config"].get("Labels", {}).get("cydeline.run", "").startswith("run_"):
        raise RuntimeError("Only a labelled Sentinel Loop Windows VM may be inspected")
    subprocess.run(["docker", "exec", "-i", args.container, "python3", "-"], input=CAPTURE, text=True, check=True, timeout=35)
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sentinel-vnc-capture-") as temporary:
        ppm = Path(temporary) / "display.ppm"
        subprocess.run(["docker", "cp", args.container + ":/vm/diagnostic.ppm", str(ppm)], check=True, timeout=20, capture_output=True)
        Image.open(ppm).save(output)
    print(json.dumps({"screenshot": str(output)}))


if __name__ == "__main__":
    main()
