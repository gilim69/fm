import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';

http.createServer(function (request, response) {
try {
    const time = new Date().toLocaleString();
    const uri = url.parse(request.url).pathname;
    const filename = path.join(process.cwd(), uri).split('?')[0];
    let query = url.parse(request.url).query;
    if (!query) query = "-";
    console.log(time, 'URI: ', uri, ' QUERY: ', query, "filename:", filename);

    if (request.method === 'POST') {
        console.log('=============================================================');
        const chunks = [];

        request.on('data', (chunk) => {
          chunks.push(chunk);
        });
    
        request.on('end', () => {
          const buffer = Buffer.concat(chunks);
          fs.writeFile(path.join(process.cwd(), uri), buffer, (err) => {
            if (err) {
              console.error(time, err);
              response.writeHead(510, { 'Content-Type': 'text/plain' });
              response.write('File '+ uri + ' upload ERROR!');
              response.end();
              return;
            } else {
                response.writeHead(200, { 'Content-Type': 'text/plain' });
                response.write('File '+ uri + ' uploaded!');
                response.end();
                console.log(time, uri, ' uploaded')
            };
          });
        });
    
        return;
    }

    fs.exists(filename, function  fileExists(exists) {
        if (!exists) {
            response.writeHead(404, {'Content-Type': 'text / plain'});
            response.write('404 File Not Found \n');
            response.end();
            console.log(time, filename, ' no exist ERROR')
            return;
        }
    });

    if (query.indexOf('rename') >= 0) {
        try {
            const newName = path.dirname(filename) + query.replace('rename=','/');
            console.log("RENAME:", filename, newName);
            fs.renameSync(filename, newName);
            response.writeHead(200, { 'Content-Type': 'text / plain' });
            response.end(filename + ' rename to ' + newName);
            console.log(time, filename + ' переименован в ' + newName);
        } catch (error) {
            response.writeHead(503, { 'Content-Type': 'text / plain' });
            response.end(filename + ' - rename error:' + error);
            console.log(time, filename + ' - ошибка при переименовании: ' + error);
        }
        return;
    }

    if (query.indexOf('mkdir') >= 0) {
        try {
            const newFolder = filename + query.replace('mkdir=','/');
            console.log('New folder:', newFolder);
            fs.mkdirSync(newFolder);
            response.writeHead(200, { 'Content-Type': 'text / plain' });
            response.end(newFolder + '  was created');
            console.log(time, newFolder + ' создана папка ');
        } catch (error) {
            response.writeHead(503, { 'Content-Type': 'text / plain' });
            response.end( 'error:' + error);
            console.log(time, 'Ошибка при создании папки: ' + error);
        }
        return;
    }

    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
        if (query.indexOf('rmdir') >= 0) {
            try {
                fs.rmdirSync(filename, { recursive: true, force: true });
                response.writeHead(200, { 'Content-Type': 'text / plain' });
                response.end(filename + ' removed');
                console.log(time, 'Папка ' + filename + ' удалена!');
            } catch (error) {
                response.writeHead(501, { 'Content-Type': 'text / plain' });
                response.end('Папка ' + filename + ' - ошибка при удалении: ' + error);
                console.log(time, 'Папка ' + filename + ' - ошибка при удалении: ' + error);
            }
            return;
        }

        let fileList = [];
        fs.readdirSync(filename).forEach(file => {
            fileList.push({ isDir: fs.lstatSync(filename + '/' + file).isDirectory(), name: file });
        });
        console.log(fileList);
        const answ = JSON.stringify(fileList);
        response.writeHead(200, { 'Content-Type': 'text / plain' });
        response.end(answ);
        return;
    }

    if (query.indexOf('remove') >= 0) {
        try {
            fs.unlinkSync(filename);
            response.writeHead(200, { 'Content-Type': 'text / plain' });
            response.end(filename + ' removed');
            console.log('Файл ' + filename + ' удален!');
        } catch (error) {
            response.writeHead(502, { 'Content-Type': 'text / plain' });
            response.end('Файл ' + filename + ' - ошибка при удалении: ' + error);
            console.log(time, 'Файл ' + filename + ' - ошибка при удалении: ' + error);
        }
        return;
    }

    fs.readFile(filename, 'binary', function (err, file) {
        if (err) {
            response.writeHead(501, { 'Content-Type': 'text / plain' });
            response.write(err + '\n');
            response.end();
            return;
        };

        response.writeHead(200);
        response.write(file, 'binary');
        response.end();
        return;
    });
} catch (err) {
    let t = new Date().toLocaleString();
    console.log(t, err)
}
}).listen(8080);

console.log('Сервер работает по адресу http://localhost: 8080 /'); 