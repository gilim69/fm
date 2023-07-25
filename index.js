/**
* Простой счетчик для навешивания id на элементы (не комильфо, но здесь подойдет :) 
*/
var id = 1;

/**
* Построение дерева папок и файлов по результатам асинхронного запроса на сервер 
*/
const getTree = async (node, opened) => {

    try {
        let data = [];
        const path = getNodePath(node) + node.innerText;

        let response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        data = await response.json();
        data.sort((a, b) => {
            return (b.isDir & 1) - (a.isDir & 1);
        });
        addChildren(node, data, opened);
        Array.from(node.children[0].children)
            .filter(elem => elem.className === 'folder').forEach(subFolder => {
                getTree(subFolder, false);
            });
        
    } catch (error) {
        console.error(error.message);
        addChildren(node, [{ name: error.message, isDir: false }]);
    } finally {
        return 0;
    }
};

/**
* Построение пути до текущего узла (папки или файла), начиная с вершины хранилища
*/
const getNodePath = (node) => {

    let elem = node;
    let path = '';

    while ((elem !== null) && (elem.id !== 'Storage')) {
        elem = elem.parentElement;
        if (elem.classList.contains('folder')) path = elem.firstChild.textContent + '/' + path; 
    }
    return '/' + path;
}

/**
* Добавление дочерних элементов к текущему узлу папки по данным запроса к серверу
*/
const addChildren = (parent, data, opened) => {

    if (!data) return;
    const ul = document.createElement('ul');
    if (!opened) ul.style.display = 'none';
    parent.appendChild(ul)

    data.forEach(elem => {
        const li = document.createElement('li');
        ul.appendChild(li);
        li.id = id++;
        li.className = elem.isDir? 'folder' : 'file';
        li.innerText = elem.name;
        li.addEventListener('click', handleNodeClick);
        li.addEventListener('mouseenter', showFileDescription);
       // li.addEventListener('mouseleave', ()=>$('#view-description').hide(280));
        contextMenuListener(li);
    });
};

/**
* Обработка нажатия кнопки мыши на элементе дерева
*/
const handleNodeClick = (event) => {

    event.stopImmediatePropagation();
    event.preventDefault();
    const target = event.target;
    if (target.tagName != 'LI') return;
    const id = target.id;

    if ($(target).hasClass('folder')) {
        $(target.children[0]).toggle(480);
        if ($(target).hasClass('opened')) {
            $(target).removeClass('opened');
        } else {
            $(target).addClass('opened');
        }
        $('li.folder.current').removeClass('current');
        $(target).addClass('current');

        return;
    } 
    
    if ($(target).hasClass('viewed')) {
        if (!$(target).hasClass('current')) {
            $('li.file.current, .file-tab.current, .file-data.current').removeClass('current');
            $('#file-tab'+id).addClass('current');
            $('#file-data'+id).addClass('current');
            $(target).addClass('current');
        }
    } else {
        $('li.file.current, .file-tab.current, .file-data.current').removeClass('current');
        openFileView(target);
    }

 //   fileDescription(document.querySelector('#file-data'+id).innerText,  event.clientY-10, event.clientX+10);
};

/**
* Закрытие окна просмотра содержимого файла
*/
const closeFileView = (event) => {

    event.stopPropagation();  
    const fileTab = event.target.parentElement;
    const id = fileTab.id.replace('file-tab','');
    const isCurrent = $(fileTab).hasClass('current')

    $(fileTab).remove();
    $('#file-data'+id).remove();
    $('#'+id).removeClass('viewed');

    if (isCurrent) {
        $('#'+id).removeClass('current');
        $('.file-tab').first().addClass('current');
        $('.file-data').first().addClass('current');
        let newCurrentLiId = $('.file-tab').first().attr('id')
        if (newCurrentLiId) 
            $('#'+newCurrentLiId.replace('file-tab','')).addClass('current');
    }
};

/**
* Открытие окна просмотра содержимого файла
*/
const openFileView = (node) => {

        const view = document.querySelector('.view');
        $('.file.current').removeClass('current');
        $(node).addClass('current');

        const viewFiles = document.getElementsByClassName('view-files')[0];
        const viewTabs = document.getElementsByClassName('view-tabs')[0];

        const fileDataView = document.createElement('div');
        fileDataView.id = 'file-data' + node.id;
        viewFiles.appendChild(fileDataView);
        fileDataView.className = 'file-data current';

        const fileTab = document.createElement('div');
        fileTab.id = 'file-tab' + node.id;
        fileName = node.innerText;

        if (fileName.length > 12) fileName = fileName.substring(0, 12)+'...';
        fileTab.innerHTML = fileName + '<span class="close-button">&#10006;</span>';
        $(fileTab).on('click', changeViewSelection);
        $(fileTab).find('span').on('click', closeFileView);
        $(fileTab).appendTo(viewTabs);
        fileTab.className = 'file-tab current';

        getFileData(node).then((data) => {fileDataView.innerHTML = syntaxLights(data);
        });
        
        $(node).addClass('viewed');
};

/**
* Асинхронное получение содержимого файла
*/
const getFileData = async (node) => {

    const path = getNodePath(node) + node.innerText;
    let response;

    try {
        response = await fetch(path);
        if (response.ok) {
            return await response.text();
        }

    } catch (error) {
        console.error("Ошибка при чтении файла:", error);
        return "Ошибка при чтении файла"; 
    }
}

/**
* Создание и отображение дескриптора файла при наведении мыши
*/
const showFileDescription = (event) => {

    event.stopPropagation();
    const viewDescription = document.getElementById('view-description');
    const node = event.target;

    if (node.classList.contains('folder')) {
        viewDescription.innerText = '';
        viewDescription.style.display='none';
        return;        
    }

    const fPath = getNodePath(node) + node.innerText;
    fetch(fPath)
        .then((response) => response.text())
        .then((data) => {
            const s0 = data.indexOf('<summary>');
            if (s0 < 0) {
                viewDescription.innerText = '';
                viewDescription.style.display='none';
                return;
            }
            const s1 = data.indexOf('\n', s0);
            const s2 = data.lastIndexOf('\n', data.indexOf('</summary>'));
            const description = data.substring(s1 + 1, s2).replace(/\/{3}/g, '');

            viewDescription.innerText = description;
            viewDescription.style.top = event.y + 'px';
            viewDescription.style.left = (event.x + 30) + 'px';
            $(viewDescription).show(280);
        })
}

/**
* Редактирование и запись дескриптора файла 
*/
const writeFileDescription = (isOk) => {

    $('#view-description-form').hide(480);
    if (!isOk) return;

    let arr = $('#view-description-form textarea').val().split('\n');
    for (i = 0; i< arr.length; i++) {
        arr[i] = '///' + arr[i];
    }
    arr.unshift('<summary>');
    arr.push('///</summary>');
    let description = arr.join('\n');

    const node = document.querySelector('li.file.current');
    const fPath = getNodePath(node) + node.innerText;
    let newData = '';

    getFileData(node)
        .then((data) => {
            const s1 = data.indexOf('<summary>');
            if (s1 < 0) {
                newData = '///' + description + '\n' + data;
            } else {
                const s2 = data.indexOf('</summary>');
                newData = data.substring(0, s1) + description + data.substring(s2 + 10);
            };
            return newData;
        })
        .then((newData) => {
            return fetch(fPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                    },
                body: newData
            })
        })
        .then((response) => {
            console.log('response');
            const fileData = document.querySelector('#file-data' + node.id);
            if (fileData) fileData.innerHTML = syntaxLights(newData);
            return response.text();
        })
        .then((res) => {
            console.log('res:', res);
        })
        .catch((error) => {
                console.error('Ошибка записи файла (description):', error);
            //    alert(fPath + ' ошибка записи дескриптора файла');
        });

            return;
};

/**
* Вывод контекстного меню при нажатии правой кнопки мыши над элементом дерева
*/
const contextMenuListener = (elem) => {

    elem.addEventListener('contextmenu', (event) => {

        event.preventDefault();
        event.stopPropagation();

        $('.popup').css('top', '-200px');
        $('.for-top').removeClass('hide');
        $('#view-description').hide(80);
        $('#view-description-form').hide(80);

    if (!$(event.target).attr('id') != 'view-descriptio-div')
        $('#view-description-form').hide(80);

        const nodeType = $(elem).hasClass('folder')? 'folder' : 'file';
        if (!$(elem).hasClass('current')) {
            $('li.'+nodeType+'.current').removeClass('current');
            $(elem).addClass('current');
        }

        if (elem.id === 'Storage') {
            for (i=0; i < 4; i++)
               $('.for-top').addClass('hide');
        }

        $('#menu-'+nodeType).offset({top: event.clientY-3, left: event.clientX-3}); 
    });
}

/**
* Обработка выбора из контекстного меню
*/
const  menuAction = () => {

    event.stopPropagation();
    const target = event.target;

    if (target.tagName === 'HR') return;;

    if (target.parentElement.id === 'menu-folder') {
        switch (target.innerText) {
            case 'Переименовать':
                renameNode('folder');
                break;
            case 'Удалить':
                deleteNode('folder');
                break;
            case 'Создать новую папку':
                createFolder();
                break;
        }
        return;
    }; 
        
    switch (target.innerText) {
            case 'Переименовать':
                renameNode('file');
                break;
            case 'Удалить':
                deleteNode('file');
                break;
            case 'Скачать':
                downloadFile();
                break;
            case 'Редактировать описание':
                document.querySelector('#view-description-form textarea').value = 
                        document.querySelector('#view-description').innerHTML.replaceAll('<br>','\n');
                $('#view-description-form').show(480);
        };
}

/**
* Асинхронное удаление файла и папки (тип объекта задается параметром)
*/
const deleteNode = (nodeType) => {

    const node = document.querySelector('li.' + nodeType + '.current');

    if (!node) {
        alert('Не найдена текущая папка/файл!');
        return;
    }

    let fPath = getNodePath(node) + $(node)[0].childNodes[0].nodeValue;
    const confirmText = (nodeType === 'folder') ? ('Удалить папку "' + fPath + '" и ее содержимое?') :
        ('Удалить файл ' + fPath + '?')
    if (confirm(confirmText)) {
        fPath = fPath + (nodeType === 'folder' ? '?rmdir' : '?remove');

        fetch(fPath)

            .then((res) => {
                const newId = $(node).next('.' + nodeType).attr('id') || $(node).prev('.' + + nodeType).attr('id');
                $('#' + newId + ', #file-tab' + newId + ', #file-data' + newId).addClass('current');
                $(node).remove();
            })

            .catch((err) => {
                console.log(err);
                alert('Ошибка удаления! ' + err)
            })
    }
}

/**
* Асинхронное переименование папки или файла с проверкой допустимых символов (тип объекта задается параметром)
*/
const renameNode = (nodeType) => {
    const node = document.querySelector('li.' + nodeType + '.current');
    if (!node) {
        alert('Не найдена текущая папка/файл!');
        return;
    }

    const filename = node.firstChild.textContent;
    const regex = /^[^<>:"/\\|?*\x00-\x1F]+$/;
    let test = false
    let newName = '';
    while (!test) {
        newName = prompt('Введите новое имя ' + 
            (nodeType === 'folder' ? 'папки:' : 'файла:'), filename);
        if (!newName) return;
        if (filename === newName) return;
        if (!regex.test(newName)) {
            alert('Недопустимые символы в имени файла!');
        } else
            test = true;
    }

    let fPath = getNodePath(node) + filename;
    fPath += '?rename=' + newName;

    fetch(fPath)
        .then(() => {
            node.firstChild.textContent = newName;
            if (nodeType==='file') {
                const fileTab = document.querySelector('#file-tab' + node.id)
                fileTab? fileTab.firstChild.textContent = newName : null;
            };
        })
        .catch((error) => {
            console.log(error);
            alert('Ошибка переименования! ' + error);
        })
}

/**
* Асинхронное создание папки с проверкой допустимых символов
*/
const createFolder = () => {
    const node = document.querySelector('li.folder.current');
    if (!node) {
        alert('Не найдена текущая папка!');
        return;
    }

    const parentFolder = node.firstChild.textContent;
    const regex = /^[^<>:"/\\|?*\x00-\x1F]+$/;
    let test = false
    let newFolder = '';
    while (!test) {
        newFolder = prompt('Введите имя для новой папки:').trim();
        if (!newFolder) return;
        if (!regex.test(newFolder)) {
            alert('Недопустимые символы в имени папки!');
        } else
            test = true;
    }

    let fPath = getNodePath(node) + parentFolder;
    fPath += '?mkdir=' + newFolder;

    fetch(fPath)
        .then(() => {
            node.children[0].remove();
            getTree(node, true);
            $(node).addClass('opened');
        })
        .catch((error) => {
            console.log(error);
            alert('Ошибка при создании папки: ' + error);
        })
}

/**
* Асинхронная загрузка файла
*/
const uploadFile = () => {

    const node = document.querySelector('li.folder.current');
    const file = document.getElementById('file-upload').files[0];
    if (!file) return;
    if (node.children[0]) node.removeChild(node.children[0]);
    const url = getNodePath(node) + node.innerText + '/' + file.name;
    console.log(url);

    fetch(url, {
            method: 'POST', 
            body: file
    })
        .then((response) => response.text())
        .then((result) => {
            console.log(url + ' загружен:', JSON.stringify(result));
        })
        .catch((error) => {
            console.log('Error', error);
            console.error('Ошибка загрузки файла:', error);
        })
        .finally(() => {
            getTree(node, true);
            $(node).addClass('opened current');
        });
};

/**
* Скачивание файла
*/
const downloadFile = () => {

    node = document.querySelector('li.file.current');
    if (!node) {
        alert('Не найдена текущий файл!');
        return;
    }
    const filePath = getNodePath(node) + node.firstChild.textContent;
    const a = document.createElement('a');
    a.href = filePath;
    a.download = node.firstChild.textContent;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
* Смена файла в окне просмотра содержимого файлов
*/
const changeViewSelection = (event) => {

    const fileTab = event.target;
    const id = fileTab.id.replace('file-tab','');
    $('.file.current, .file-tab.current, .file-data.current').removeClass('current');
    $(fileTab).addClass('current');
    $('#'+id+', #file-data'+id).addClass('current');
}

/**
* Подсветка синтаксиса
*/
const syntaxLights = (text) => {

    const flags = {
        NONE           : 0,
        SINGLE_QUOTE   : 1, // 'string'
        DOUBLE_QUOTE   : 2, // "string"
        ML_QUOTE       : 3, // `string`
        SL_COMMENT     : 5, // // single line comment
        ML_COMMENT     : 6, // /* multiline comment */
        NUMBER_LITERAL : 7, // numbers
        KEYWORD        : 8 // function, var etc.
    };
    
    const colors = {
        NONE           : 'black', // 0 - normal text
        SINGLE_QUOTE   : 'brown', // 'string'
        DOUBLE_QUOTE   : 'brown', // "string"
        ML_QUOTE       : 'brown', // `string`
        SL_COMMENT     : 'green', // // single line comment
        ML_COMMENT     : 'green', // /* multiline comment */
        NUMBER_LITERAL : 'darkblue', // 123
        KEYWORD        : 'blue', // function, var etc.
        OPERATOR       : 'darkgrey' // null, true etc.
    };
    
    const keywords = `async|await|break|case|class|const|continue|debugger|default|delete|do|
                    else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|
                    let|new|of|package|private|protected|public|return|set|static|super|switch|throw|try|typeof|
                    var|void|while|with|yield|catch|finally`.split('|');

	let outputText = '';
    let inputText = ' ' + text + ' ';
	let flag = flags.NONE;
	for (let i = 0; i < inputText.length; i++) {
		let curr = inputText[i], prev = inputText[i-1], next = inputText[i+1];

        // single line comment
        if (flag == flags.NONE && curr == '/' && next == '/') {
            flag = flags.SL_COMMENT;
            outputText += '<span style="color: ' + colors.SL_COMMENT + '">' + curr;
            continue;
        }
        if (flag == flags.SL_COMMENT && curr == '\n') {
            flag = flags.NONE;
            outputText += '</span><br>';
            continue;
        }

        // multiline comment
        if (flag == flags.NONE && curr == '/' && next == '*') {
            flag = flags.ML_COMMENT;
            outputText += '<span style="color: ' + colors.ML_COMMENT + '">' + curr;
            continue;
        }
        if (flag == flags.ML_COMMENT && curr == '/' && prev == '*') {
            flag = flags.NONE;
            outputText += curr + '</span>';
            continue;
        }

        // string in ' '
        if (flag == flags.NONE && curr == "'") {
            flag = flags.SINGLE_QUOTE;
            outputText += '<span style="color: ' + colors.SINGLE_QUOTE + '">' + curr;
            continue;
        }
        if (flag == flags.SINGLE_QUOTE && curr == "'" && prev != '\\') {
            flag = flags.NONE;
            outputText += curr + '</span>';
            continue;
        }

        // string in " "
        if (flag == flags.NONE && curr == '"') {
            flag = flags.DOUBLE_QUOTE;
            outputText += '<span style="color: ' + colors.DOUBLE_QUOTE + '">' + curr;
            continue;
        }
        if (flag == flags.DOUBLE_QUOTE && curr == '"' && prev != '\\') {
            flag = flags.NONE;
            outputText += curr + '</span>';
            continue;
        }
        
        // string in ` `
        if (flag == flags.NONE && curr == '`') {
            flag = flags.ML_QUOTE;
            outputText += '<span style="color: ' + colors.ML_QUOTE + '">' + curr;
            continue;
        }
        if (flag == flags.ML_QUOTE && curr == '`'  && prev != '\\') {
            flag = flags.NONE;
            outputText += curr + '</span>';
            continue;
        }

        // numbers
        if (flag == flags.NONE && /[0-9]/.test(curr) && !/[0-9a-z$_]/i.test(prev)) {
            flag = flags.NUMBER_LITERAL;
            outputText += '<span style="color: ' + colors.NUMBER_LITERAL + '">' + curr;
            continue;
        }
        if (flag == flags.NUMBER_LITERAL && !/[0-9a-fnx]/i.test(curr)) {
            flag = flags.NONE;
            outputText += curr + '</span>'
        }

        // keywords
        if (flag == flags.NONE && !/[a-z0-9$_]/i.test(prev)) {
            let word = '', j = 0;
            while (inputText[i + j] && /[a-z]/i.test(inputText[i + j])) {
                word += inputText[i + j];
                j++;
            }
            if (keywords.includes(word)) {
                    flag = flags.KEYWORD;
                    outputText += '<span style="color: ' + colors.KEYWORD + '">';
            }
        }
        if (flag == flags.KEYWORD && !/[a-z]/i.test(curr)) {
            flag = flags.NONE;
            outputText += '</span>';
        }
        if (flag == flags.NONE && '+-/*=&|%!<>?:'.indexOf(curr) != -1) {
            outputText += '<span style="color: ' + colors.OPERATOR + '">' + curr + '</span>';
            continue;
        } 
        outputText += curr.replace('<','&lt;').replace('>','&gt;').replace(' ', '&nbsp;');
	}

    outputText = outputText.replaceAll('\n','<br>');
    
	return outputText;
}


/**
* Обработка нажатия мышки вне контекстного меню или описания файла
*/
document.addEventListener('click', function(event) {

    if (!$(event.target).hasClass('popup')) 
        $('.popup').css('top', '-200px');

    if (event.target.id !== 'view-description')
        $('#view-description').hide(80);

    if ((event.target.id != 'view-description-form') && 
        (event.target.parentElement.id != 'view-description-form')) 
            $('#view-description-form').hide(80);

}, true);

/**
* Создание дерева с вершины после загрузки документа
*/
$(document).ready(function() {
    getTree(document.getElementById('Storage'), true);
    contextMenuListener(document.getElementById('Storage'));
});