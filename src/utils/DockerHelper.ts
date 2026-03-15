import { exec } from 'child_process';

export function runInContainer(image: string, ports: string[], env: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const portArgs = ports.map((p) => `-p ${p}`).join(' ');
    const envArgs = Object.entries(env)
      .map(([k, v]) => `-e ${k}=${v}`)
      .join(' ');
    const cmd = `docker run -d ${portArgs} ${envArgs} ${image}`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

export function stopContainer(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`docker rm -f ${id}`, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
