import type { ApiEndpoint, RequestExample } from '@/types';

export type CodeLanguage = 'curl' | 'javascript' | 'javascript-axios' | 'python' | 'java' | 'java-spring' | 'go';

export interface CodeGeneratorResult {
  language: CodeLanguage;
  code: string;
}

export function generateCode(
  endpoint: ApiEndpoint,
  example: RequestExample,
  language: CodeLanguage
): string {
  switch (language) {
    case 'curl':
      return generateCurlCode(example);
    case 'javascript':
      return generateJavaScriptFetchCode(endpoint, example);
    case 'javascript-axios':
      return generateJavaScriptAxiosCode(endpoint, example);
    case 'python':
      return generatePythonCode(endpoint, example);
    case 'java':
      return generateJavaHttpClientCode(endpoint, example);
    case 'java-spring':
      return generateJavaSpringCode(endpoint, example);
    case 'go':
      return generateGoCode(endpoint, example);
    default:
      return generateCurlCode(example);
  }
}

function generateCurlCode(example: RequestExample): string {
  let code = `curl -X ${example.method} "${example.url}"`;
  
  for (const [key, value] of Object.entries(example.headers)) {
    code += ` \\\n  -H "${key}: ${value}"`;
  }
  
  if (example.body) {
    const bodyStr = JSON.stringify(example.body, null, 2);
    code += ` \\\n  -d '${bodyStr}'`;
  }
  
  return code;
}

function generateJavaScriptFetchCode(endpoint: ApiEndpoint, example: RequestExample): string {
  const hasBody = example.body !== undefined;
  const bodyStr = hasBody ? JSON.stringify(example.body, null, 4) : 'null';
  
  return `const url = '${example.url}';

const options = {
  method: '${example.method}',
  headers: ${JSON.stringify(example.headers, null, 4)},
  ${hasBody ? `body: JSON.stringify(${bodyStr}),` : ''}
};

fetch(url, options)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
}

function generateJavaScriptAxiosCode(endpoint: ApiEndpoint, example: RequestExample): string {
  const hasBody = example.body !== undefined;
  const bodyStr = hasBody ? JSON.stringify(example.body, null, 4) : 'null';
  
  return `import axios from 'axios';

const url = '${example.url}';

axios({
  method: '${example.method}',
  url: url,
  headers: ${JSON.stringify(example.headers, null, 4)},
  ${hasBody ? `data: ${bodyStr},` : ''}
})
.then(response => {
  console.log(response.data);
})
.catch(error => {
  console.error('Error:', error);
});`;
}

function generatePythonCode(endpoint: ApiEndpoint, example: RequestExample): string {
  const hasBody = example.body !== undefined;
  
  let code = `import requests

url = '${example.url}'
headers = ${JSON.stringify(example.headers, null, 4)}
${hasBody ? `data = ${JSON.stringify(example.body, null, 4)}` : ''}

response = requests.${endpoint.method.toLowerCase()}(url, ${hasBody ? 'json=data, ' : ''}headers=headers)

print(response.status_code)
print(response.json())`;
  
  return code;
}

function generateJavaHttpClientCode(endpoint: ApiEndpoint, example: RequestExample): string {
  const hasBody = example.body !== undefined;
  const bodyStr = hasBody ? JSON.stringify(example.body) : '';
  
  const headersCode = Object.entries(example.headers)
    .map(([key, value]) => `                .header("${key}", "${value}")`)
    .join('\n');
  
  return `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ApiClient {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("${example.url}"))
                .method("${example.method}", ${hasBody ? `HttpRequest.BodyPublishers.ofString("${bodyStr}")` : "HttpRequest.BodyPublishers.noBody()"})
${headersCode}
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println(response.statusCode());
        System.out.println(response.body());
    }
}`;
}

function generateJavaSpringCode(endpoint: ApiEndpoint, example: RequestExample): string {
  const hasBody = example.body !== undefined;
  const bodyStr = hasBody ? JSON.stringify(example.body) : 'null';
  
  const headersCode = Object.entries(example.headers)
    .map(([key, value]) => `        headers.set("${key}", "${value}");`)
    .join('\n');
  
  return `import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

public class ApiClient {
    public static void main(String[] args) {
        RestTemplate restTemplate = new RestTemplate();
        
        String url = "${example.url}";
        HttpHeaders headers = new HttpHeaders();
${headersCode}
        
        ResponseEntity<String> response = restTemplate.exchange(
            url,
            HttpMethod.${endpoint.method},
            ${hasBody ? `new org.springframework.http.HttpEntity<>("${bodyStr}", headers)` : "null"},
            String.class
        );

        System.out.println(response.getStatusCode());
        System.out.println(response.getBody());
    }
}`;
}

function generateGoCode(endpoint: ApiEndpoint, example: RequestExample): string {
  const hasBody = example.body !== undefined;
  const bodyStr = hasBody ? JSON.stringify(example.body) : 'nil';
  
  const headersCode = Object.entries(example.headers)
    .map(([key, value]) => `\treq.Header.Set("${key}", "${value}")`)
    .join('\n');
  
  return `package main

import (
    "fmt"
    "io"
    "net/http"
    "strings"
)

func main() {
    url := "${example.url}"
    ${hasBody ? `payload := strings.NewReader(${bodyStr})` : ''}

    req, err := http.NewRequest("${example.method}", url, ${hasBody ? 'payload' : 'nil'})
    if err != nil {
        fmt.Println(err)
        return
    }
${headersCode}

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        fmt.Println(err)
        return
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(resp.StatusCode)
    fmt.Println(string(body))
}`;
}

export const languageLabels: Record<CodeLanguage, string> = {
  curl: 'cURL',
  javascript: 'JavaScript (Fetch)',
  'javascript-axios': 'JavaScript (Axios)',
  python: 'Python (requests)',
  java: 'Java (HttpClient)',
  'java-spring': 'Java (Spring)',
  go: 'Go (net/http)',
};

export const languageGroups: { name: string; languages: CodeLanguage[] }[] = [
  { name: '命令行', languages: ['curl'] },
  { name: 'JavaScript', languages: ['javascript', 'javascript-axios'] },
  { name: 'Python', languages: ['python'] },
  { name: 'Java', languages: ['java', 'java-spring'] },
  { name: 'Go', languages: ['go'] },
];
