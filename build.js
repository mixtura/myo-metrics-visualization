const fs = require('fs');
const fsx = require('fs').promises
const path = require('path');

function createDir(path) {
  return fsx
    .access(path, fs.constants.F_OK)
    .catch(() => fsx.mkdir(path, {recursive: true}));
}

function copy(source, destination) {
  return fsx
    .copyFile(source, destination)
    .then(() => console.log(`${source} was copied to ${destination}`));
}

function copyDir(source, destination) {  
  return createDir(destination)
    .then(() => fsx.readdir(source, { withFileTypes: true }))
    .then(files => {     
      const operations = files.map(file => {
        const fileName = file.name;
        const fileSourcePath = path.resolve(source, fileName);
        const fileDestinationPath = path.resolve(destination, fileName);
  
        if(file.isDirectory()) {
          return copyDir(fileSourcePath, fileDestinationPath);        
        } else {
          return copy(fileSourcePath, path.resolve(destination, fileName));
        }
      });

      return Promise.all(operations);
    });
}

const visPath = require.resolve('vis');
const visDistPath = path.dirname(visPath);

createDir('public')
  .then(() => 
    Promise.all([
      copyDir(visDistPath, 'public/vis'),
      copy('index.html', 'public/index.html'),
      copy('client.js', 'public/client.js')
    ]))
  .catch(err => console.log(err));