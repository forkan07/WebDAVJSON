<?php

cors();

switch (strtoupper($_SERVER['REQUEST_METHOD'])) {
    case 'GET':
        if (isset($_GET['filename'])) {
            download($_GET['filename']);
        } else {
            ls();
        }
        break;
    case 'POST':
    case 'PUT':
        upload();
        break;
    case 'DELETE':
        if (isset($_GET['filename'])) {
            download($_GET['filename']);
        }
        break;
    default:
        break;
}

function cors()
{
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: *");
    header("Access-Control-Allow-Headers: *");
}

function assert_filename($filename)
{
    if (!preg_match('/^[\w.-]+$/', $filename)) {
        http_response_code(400);
        exit();
    }

    $allowed_extensions = 'txt,jpg,png,webp,heic,gif,pdf,docx,xlsx,zip,mp4,gz';
    $allowed_extensions = explode(',', $allowed_extensions);
    $extension = pathinfo($filename, PATHINFO_EXTENSION);
    if (!in_array(strtolower($extension), $allowed_extensions)) {
        http_response_code(400);
        exit();
    }
}

function ls()
{
    header('Content-Type: application/json');
    $files = array_diff(scandir('.'), array('..', '.'));
    echo json_encode($files, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function download($filename)
{
    if (file_exists($filename)) {
        assert_filename($filename);
        header('Content-Type: ' . mime_content_type($filename));
        readfile($filename);
    } else {
        http_response_code(404);
    }
}

function upload()
{
    if ($_FILES) {
        foreach ($_FILES as $file) {
            if (is_array($file['error'])) {
                foreach ($file['error'] as $index => $error) {
                    if ($error === UPLOAD_ERR_OK) {
                        assert_filename($file['name'][$index]);
                        move_uploaded_file($file['tmp_name'][$index], $file['name'][$index]);
                    }
                }
            } else {
                if ($file['error'] === UPLOAD_ERR_OK) {
                    assert_filename($file['name']);
                    move_uploaded_file($file['tmp_name'], $file['name']);
                }
            }
        }
    } else if (isset($_GET['filename'])) {
        assert_filename($_GET['filename']);
        file_put_contents($_GET['filename'], file_get_contents('php://input'));
    }
}

function delete($filename)
{
    if (file_exists($filename)) {
        unlink($filename);
    } else {
        http_response_code(404);
    }
}
