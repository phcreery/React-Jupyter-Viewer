// React
import React from "react";

// UI
import { Card, Spin, Tag, Col, Row, Typography } from "antd";
import "./App.css";

// Math
import RemarkMathPlugin from "remark-math";
import Tex from "@matejmazur/react-katex";
import "katex/dist/katex.min.css";

// AceCodeEditor
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-kuroir";
import "ace-builds/src-noconflict/theme-terminal";
import 'ace-builds/src-noconflict/theme-iplastic'

const ReactMarkdown = require("react-markdown");

class JupViewer extends React.Component {
  state = {
    // File_Path
    file_path: "",
    file_base_path: "",
    loading: true,
    notebook_json: null,
    placeholder_component: "Loading....",

  };

  static defaultProps = {
    dark_theme: false,
    gutterVisible: false,
    light: {
      // Editor Theme
      editor_theme: "lightTheme", // CSS class name that covers overall div and markdown
      text_editor_theme: "iplastic", // Ace Editor theme
      // Text:
      // background_theme: "white", // Not used anywhere?
      title_text_theme: "black", // Title Color
      background_input_theme: '#E8E9E8', // input text: Ace editor background color
      background_output_theme: 'rgba(0, 0, 0, 0)', // output text: Card and Row background color

    },
    dark: {
      // Editor Theme
      editor_theme: "darkTheme",
      text_editor_theme: "monokai",
      // Text:
      // background_theme: "black",
      title_text_theme: "white", // Title Color
      background_input_theme: "#272822",
      background_output_theme: "#2F3129",
    },
  };

  validURL(str) {
    var pattern = new RegExp(
      "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
      "i"
    ); // fragment locator
    return !!pattern.test(str);
  }

  async componentDidMount() {
    if (!!this.props.file) {
      var fbase = this.props.file.split("/");
      fbase.pop();
      this.setState({
        file_path: this.props.file,
        file_base_path: fbase.join("/") + "/",
      });
      await fetch(this.props.file)
        .then((r) => r.text())
        .then(async (text) => {
          try {
            var notebook_json = JSON.parse(text);
            this.setState({
              notebook_json: notebook_json,
              loading: false,
              placeholder_component: "Notebook loaded",
            });
            console.log(this.state.notebook_json);
          } catch (error) {
            alert("OOps! Unable to load json");
            this.setState({
              notebook_json: { message: "Unable to parse .ipynb file" },
              loading: false,
              placeholder_component:
                "Oops! We have problem opening the notebook",
            });
          }
        });
    }
  }

  praseSource(source) {
    var cell_content = ``;
    for (var code in source) {
      cell_content += source[code];
    }
    return cell_content;
  }

  parseMD(source) {
    var cell_content = ``;
    for (var code in source) {
      var rgx = new RegExp(/src="(.*?)"/);
      var new_source = source[code];
      var old_source = source[code].match(rgx);
      if (!!old_source && !this.validURL(old_source[1])) {
        new_source = source[code].replace(
          /src="(.*?)"/,
          'src="' + this.state.file_base_path + old_source[1] + '"'
        );
      } else {
        var rgx2 = new RegExp(/\!\[(.*?)\]\((.*?)[\s|\)]/);
        var s2 = source[code].match(rgx2);
        if (!!s2 && !this.validURL(s2[2])) {
          new_source = new_source.replace(s2[2], this.state.file_base_path + s2[2]);
        }
      }

      // Replace all instances of `\begin{equation}` with `$$` before going to markdown parser for katex to recognize
      var eqBeginRE_eq = new RegExp(/\\begin{equation\**}/)
      var eqEndRE_eq = new RegExp(/\\end{equation\**}/)
      if (source[code].match(eqBeginRE_eq)) {
        new_source = '\n$$\n'
        // console.log(source[code].match(eqBeginRE_eq), new_source)
      } else if (source[code].match(eqEndRE_eq)) {
        new_source = '$$\n\n'
      }

      var eqBeginRE_align = new RegExp(/\\begin{align.*}/)
      var eqEndRE_align = new RegExp(/\\end{align.*}/)
      if (source[code].match(eqBeginRE_align)) {
        new_source = '\n$$\n\n\\begin{aligned}\n'
        // console.log(source[code].match(eqBeginRE_align), new_source)
      } else if (source[code].match(eqEndRE_align)) {
        new_source = '\\end{aligned}\n$$\n\n'
      }
      cell_content += new_source;
    }
    return cell_content;
  }

  // Math Equations: Custom Markdown parser with math (katex) support
  ReactMarkdownWithEquations(props) {
    const newProps = {
      ...props,
      plugins: [RemarkMathPlugin],
      renderers: {
        // ...props.renderers,
        inlineMath: (props) => <Tex math={props.value} />,
        math: (props) => <Tex block math={props.value} />,
      },
    };
    return <ReactMarkdown {...newProps} />;
  }

  // Data Cells
  praseOutputs(outputs) {
    if (outputs.length === 0) {
      return "";
    }
    // Handle "data" type cells
    var text_plain = ``;
    var stdout = ``;
    var errors = ``;
    var img_data = `data:image/png;base64,`;

    // booleans
    var stdout_found = false;
    var text_found = false;
    var error_found = false;
    var img_found = false;

    // maxlines for each output type
    var lines_stdout = 3;
    var lines_text_plain = 3;
    var lines_error_trace = 3;
    for (var outs in outputs) {
      if ("data" in outputs[outs]) {
        if ("text/plain" in outputs[outs]["data"]) {
          for (var text in outputs[outs]["data"]["text/plain"]) {
            text_plain += outputs[outs]["data"]["text/plain"][text];
          }
          text_found = true;
          lines_text_plain = outputs[outs]["data"]["text/plain"].length;
        }
        if ("image/png" in outputs[outs]["data"]) {
          img_data += outputs[outs]["data"]["image/png"];
          img_found = true;
        }
      }
      if ("name" in outputs[outs]) {
        for (var text in outputs[outs]["text"]) {
          stdout += outputs[outs]["text"][text];
        }
        stdout_found = true;
        lines_stdout = outputs[outs]["text"].length;
      }
      // Check for errors
      if ("ename" in outputs[outs]) {
        errors +=
          outputs[outs]["ename"] + "\n" + outputs[outs]["evalue"] + "\n";
        // for (var trace in outputs[outs]["traceback"]) {
        //     errors += outputs[outs]["traceback"][trace]
        // }
        error_found = true;
        lines_error_trace = outputs[outs]["traceback"].length;
      }
    }

    var return_template = (
      <div>
        <div
          style={{
            padding: "5px 3px",
            display: stdout_found ? "" : "none",
          }}
        >
          <Tag color="#2db7f5">stdout</Tag>
          <br></br>
          <AceEditor
            readOnly
            placeholder="--"
            mode="markdown"
            theme={this.props.dark_theme ? this.props.dark.text_editor_theme : this.props.light.text_editor_theme}
            name="stdout"
            style={{
              // maxWidth: "700px",
              padding: "10px",
              margin: "10px 0px",
            }}
            width="100%"
            maxLines={lines_stdout + 1}
            fontSize={14}
            showPrintMargin={false}
            showGutter={false}
            highlightActiveLine={false}
            value={stdout}
            setOptions={{
              // enableBasicAutocompletion: false,
              // enableLiveAutocompletion: false,
              // enableSnippets: false,
              showLineNumbers: false,
              tabSize: 2,
            }}
          />
        </div>
        <div style={{ padding: "5px 3px", display: text_found ? "" : "none" }}>
          <Tag color="#87d068">data:text/plain</Tag>
          <br></br>
          <AceEditor
            readOnly
            placeholder="--"
            mode="markdown"
            theme={this.props.dark_theme ? this.props.dark.text_editor_theme : this.props.light.text_editor_theme}
            name="text"
            style={{
              // maxWidth: "700px",
              padding: "10px",
              margin: "10px 0px",
            }}
            width="100%"
            maxLines={lines_text_plain}
            fontSize={14}
            showPrintMargin={false}
            showGutter={false}
            highlightActiveLine={false}
            value={text_plain}
            setOptions={{
              // enableBasicAutocompletion: false,
              // enableLiveAutocompletion: false,
              // enableSnippets: false,
              showLineNumbers: false,
              tabSize: 2,
            }}
          />
        </div>
        <div style={{ display: img_found ? "" : "none" }}>
          <Tag color="#87d068">data:image/png</Tag>
          <br></br>
          <img
            alt="Error"
            src={img_data}
            style={{
              display: img_found ? "" : "none",
              width: "100%",
              backgroundColor: "white",
              // padding: "10px 0px 10px",
              margin: "10px 0px",
            }}
          />
        </div>
        <div style={{ padding: "5px 3px", display: error_found ? "" : "none" }}>
          <Tag color="#f50">error</Tag>
          <br></br>
          <AceEditor
            readOnly
            placeholder="--"
            mode="markdown"
            theme={this.props.dark_theme ? this.props.dark.text_editor_theme : this.props.light.text_editor_theme}
            name="error"
            style={{
              // maxWidth: "700px",
              padding: "10px",
              margin: "10px 0px",
            }}
            width="100%"
            maxLines={lines_error_trace}
            fontSize={14}
            showPrintMargin={false}
            showGutter={false}
            highlightActiveLine={false}
            value={errors}
            setOptions={{
              // enableBasicAutocompletion: false,
              // enableLiveAutocompletion: false,
              // enableSnippets: false,
              showLineNumbers: false,
              tabSize: 2,
            }}
          />
        </div>
      </div>
    );

    return return_template;
  }


  render() {
    console.log(this.props.file);
    return (
      <div>
        <br></br>
        <Spin spinning={this.state.loading}>
          <center>
            {/* This is where the blog metadata and the cover will go */}
            <div className={this.props.dark_theme ? this.props.dark.editor_theme : this.props.light.editor_theme}>
              <Card
                bodyStyle={{
                  padding: "30px 10px",
                  backgroundColor: ( this.props.dark_theme ? this.props.dark.background_output_theme : this.props.light.background_output_theme ),
                }}
                style={{
                  width: "100%",
                  // maxWidth: "800px",
                  border: "none",
                }}
              >
                <Row>
                  <Col span={1}></Col>
                  <Col span={22}>
                    <Typography.Title
                      strong
                      style={{
                        color: ( this.props.dark_theme ? this.props.dark.title_text_theme : this.props.light.title_text_theme ),
                        // fontSize: '50px',
                        wordWrap: "break-word",
                        width: "100%",
                      }}
                    >
                      {this.props.title}
                    </Typography.Title>
                    <Typography.Title
                      level={4}
                      style={{
                        color: (this.props.dark_theme ? this.props.dark.title_text_theme : this.props.light.title_text_theme),
                        wordWrap: "break-word",
                        width: "100%",
                        display: !!this.props.subtitle ? "" : "none",
                      }}
                    >
                      {this.props.subtitle}
                    </Typography.Title>
                  </Col>
                  <Col span={1}></Col>
                </Row>

                <Row>
                  <Col span={1}></Col>
                  <Col span={22}>
                    <img
                      alt="Error"
                      style={{
                        display: !!this.props.coverImg ? "" : "none",
                        width: "100%",
                      }}
                      src={
                        !!this.props.coverImg
                          ? this.props.coverImg
                          : "http://eskipaper.com/images/simple-silver-wallpaper-1.jpg"
                      }
                    />
                  </Col>
                  <Col span={1}></Col>
                </Row>

                <br></br>
                <br></br>
                <Row>
                  <Col span={1}></Col>
                  <Col span={20}>
                    <Tag color="blue" style={{ float: "left" }}>
                      {this.state.loading
                        ? "Unknown"
                        : this.state.notebook_json["metadata"]["kernelspec"][
                            "display_name"
                          ]}
                    </Tag>
                  </Col>
                  <Col span={1}></Col>
                </Row>
              </Card>
            </div>
            {this.state.loading ? (
              <div></div>
            ) : (
              this.state.notebook_json["cells"].map((item) => (
                <Card
                  bodyStyle={{
                    padding: "0px 10px",
                    backgroundColor: (this.props.dark_theme ? this.props.dark.background_output_theme : this.props.light.background_output_theme),
                  }}
                  style={{
                    width: "100%",
                    // maxWidth: "800px",
                    border: "none",
                  }}
                >
                  <Row
                    style={{
                      backgroundColor: (this.props.dark_theme ? this.props.dark.background_output_theme : this.props.light.background_output_theme)
                    }}
                  >
                    <Col span={this.props.gutterVisible ? 3 : 1}>
                      <div
                        style={{
                          display: this.props.gutterVisible ? "" : "none",
                        }}
                      >
                        <Typography.Text
                          style={{
                            float: "left",
                            padding: "5px",
                            color: "#56ACBC",
                            display: item["cell_type"] === "code" ? "" : "none",
                          }}
                        >
                          I [ {item["execution_count"]} ]:
                        </Typography.Text>
                      </div>
                    </Col>

                    <Col
                      span={this.props.gutterVisible ? 20 : 22}
                      style={{
                        textAlign: "left",
                      }}
                    >
                      {item["cell_type"] === "code" ? (
                        <div
                          style={{
                            padding: "5px 0px",
                            borderStyle: "solid",
                            borderWidth: "0.5px",
                            backgroundColor: (this.props.dark_theme ? this.props.dark.background_input_theme : this.props.light.background_input_theme),
                          }}
                        >
                          <AceEditor
                            readOnly
                            placeholder="---"
                            mode="python"
                            theme={this.props.dark_theme ? this.props.dark.text_editor_theme : this.props.light.text_editor_theme}
                            name="code"
                            style={{
                              // maxWidth: "700px",
                              padding: "10px",
                              margin: "10px 0px",
                            }}
                            width="100%"
                            maxLines={
                              item["source"].length === 0
                                ? 1
                                : item["source"].length + 1
                            }
                            onLoad={this.onLoad}
                            onChange={this.onChange}
                            fontSize={14}
                            showGutter={true}
                            highlightActiveLine={true}
                            value={this.praseSource(item["source"])}
                            setOptions={{
                              // enableBasicAutocompletion: false,
                              // enableLiveAutocompletion: false,
                              // enableSnippets: false,
                              showLineNumbers: true,
                              tabSize: 2,
                            }}
                          />
                        </div>
                      ) : (
                        <div className="MDImg">
                          <div
                            className={this.props.dark_theme ? this.props.dark.editor_theme : this.props.light.editor_theme}
                            style={{
                              margin: "0px 0px",
                              padding: "10px",
                              // border:'solid',
                              // borderWidth:'1px'
                            }}
                          >
                            <this.ReactMarkdownWithEquations
                              style={{
                                float: "left",
                              }}
                              source={this.parseMD(item["source"])}
                              escapeHtml={false}
                            />
                          </div>
                        </div>
                      )}
                    </Col>
                    <Col span={1}></Col>
                  </Row>

                  {item["cell_type"] === "markdown" ? (
                    <div></div>
                  ) : (
                    <Row
                      style={{
                        display:
                          !!item["outputs"].length === 0 ? "none" : "visible",
                        backgroundColor: (this.props.dark_theme ? this.props.dark.background_output_theme : this.props.light.background_output_theme)
                      }}
                    >
                      <Col span={this.props.gutterVisible ? 3 : 1}>
                        <Typography.Text
                          style={{
                            display: this.props.gutterVisible ? "" : "none",
                            float: "left",
                            padding: "5px",
                            color: "#E5496A",
                          }}
                        >
                          O [ {item["execution_count"]} ]:
                        </Typography.Text>
                      </Col>
                      <Col
                        span={this.props.gutterVisible ? 20 : 22}
                        style={{
                          textAlign: "left",
                          color: "white",
                        }}
                      >
                        {this.praseOutputs(item["outputs"])}
                      </Col>
                      <Col span={1}></Col>
                    </Row>
                  )}
                </Card>
              ))
            )}
          </center>
        </Spin>
        <br></br>
      </div>
    );
  }
}


export default JupViewer;
