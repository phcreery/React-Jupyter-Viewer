import React from 'react';
// import './App.css';
import JupViewer from './JupViewer'
import { Card, Col, Row, Switch, Layout } from "antd";
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';

const ipynb = require('./Transformation2D.ipynb')

class App extends React.Component {
  state = {
    dark_theme: false,
    gutter: false,
  }

  render() {
    return (
        <Layout>
            <Row justify="center">
              <Col span={18}>
                <Card bordered hoverable style={{ marginTop: 10, marginBottom: 10, cursor: 'auto', borderColor: '#D9D9D9', backgroundColor: (this.state.dark_theme ? "#2F3129" : "") }} >
                  <Switch
                    defaultChecked = {this.state.dark_theme}
                onChange={(val) => this.setState({ dark_theme: !!val })}
                checkedChildren="Dark"
                unCheckedChildren="Light"
                  />
                  <br/><Switch
                    defaultChecked = {this.state.gutter}
                onChange={(val) => this.setState({ gutter: !!val })}
                checkedChildren={<MenuFoldOutlined />}
                unCheckedChildren={<MenuUnfoldOutlined />}
                  />
                  <JupViewer
                    title="Jupyter as a Blog!"
                    subtitle="I've always wanted to publish my jupyter notebooks as blogs. Finally I can."
                    // coverImg="https://notionpress.com/blog/wp-content/uploads/2018/06/Cover-design.png"
                    // file={ipynb}
                    gutterVisible={this.state.gutter}
                    dark_theme={this.state.dark_theme}
                    // file="https://raw.githubusercontent.com/jakevdp/PythonDataScienceHandbook/master/notebooks/00.00-Preface.ipynb"
                    // file="https://raw.githubusercontent.com/hpcreery/devtwins.js/blob/master/server/public/Projects/Jupyter%20Notebook/Transformation2D.ipynb"
                    file="https://raw.githubusercontent.com/fastai/course-v3/master/nbs/dl1/00_notebook_tutorial.ipynb"
                  />
                </Card>
              </Col>
            </Row>
        </Layout>
    )
  }
}


export default App;
